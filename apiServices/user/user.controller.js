import bcrypt from 'bcryptjs'
import { createUser, getUserById, updateUserModel } from './user.model.js'
import { signAccessToken } from '../../middlewares/jwt.js'
import consts from '../../utils/consts.js'
import { v4 as uuidv4 } from 'uuid'
import sha256 from 'js-sha256'
import moment from 'moment'
import { Logger } from '../../utils/logger.js'
import CustomError from '../../utils/customError.js'
import { storeRefresh } from '../auth/auth.model.js'

const logger = new Logger({ filename: 'user-controller.log' })

export const registerUser = async (req, res) => {
  try {
    const { email, names, lastnames, birthdate, phoneCode, phoneNumber, password, deviceId } = req.body

    const salt = await bcrypt.genSalt(10)
    const passwordHash = await bcrypt.hash(password, salt)

    const user = await createUser({
      email,
      names,
      lastnames,
      birthdate,
      phoneCode,
      phoneNumber,
      passwordHash,
    })

    // Generar access token
    const { token, expiresAt } = signAccessToken({
      userId: user.userid,
      email: user.email,
      names: user.names,
      lastnames: user.lastnames,
    })

    // Generar refresh token y almacenarlo en la base de datos
    const refreshToken = uuidv4()
    const refreshTokenHash = sha256(refreshToken).toString()
    const refreshExpiresAt = moment.utc().add(consts.tokenExpiration.refresh_days_expiration, 'day').toDate()

    const { refreshToken: storedRefreshToken, expiresAt: storedExpiresAt } = await storeRefresh(user.userid, deviceId, refreshTokenHash, refreshExpiresAt)

    return res.status(201).json({
      token,
      expiresAt,
      refreshToken: storedRefreshToken,
      refreshExpiresAt: Math.floor(new Date(storedExpiresAt).getTime() / 1000),
    })
  } catch (err) {
    logger.error(err.message, { title: 'Error en registerUser' })
    if (err instanceof CustomError) {
      return res.status(err.status).json({ error: err.message })
    }
    if (err.code === '23505') {
      return res.status(409).json({
        error: 'El correo electrónico o el número de teléfono ya están en uso',
      })
    }
    return res.status(500).json({ error: 'Error interno del servidor' })
  }
}

export const getLoggedUser = async (req, res) => {
  try {
    const { sub: userId } = req.user || {}

    if (!userId) {
      throw new CustomError('Token inválido o faltante', 401)
    }

    const user = await getUserById(userId)

    return res.status(200).json({
      user,
    })
  } catch (err) {
    logger.error(err.message, { title: 'Error en getLoggedUser' })

    if (err instanceof CustomError) {
      return res.status(err.status).json({ error: err.message })
    }

    return res.status(500).json({ error: 'Error interno del servidor' })
  }
}

export const updateUser = async (req, res) => {
  try {
    const { sub } = req.user || {}

    if (!sub) {
      throw new CustomError('Token inválido o faltante', 401)
    }
    const { userId } = req.params

    if (sub != userId) throw new CustomError('No está permitido modificar información de otros usuarios.', 403)

    const { email, names, lastnames, birthdate, phoneCode, phoneNumber } = req.body

    const user = await updateUserModel(userId, {
      email,
      names,
      lastnames,
      birthdate,
      phoneCode,
      phoneNumber,
    })

    if (!user) throw new CustomError('Ocurrió un error al actualizar el usuario', 400)

    return res.status(201).json({
      updated: user,
    })
  } catch (err) {
    logger.error(err.message, { title: 'Error en updateUser' })
    if (err instanceof CustomError) {
      return res.status(err.status).json({ error: err.message })
    }
    if (err.code === '23505') {
      return res.status(409).json({
        error: 'El correo electrónico o el número de teléfono ya están en uso',
      })
    }
    return res.status(500).json({ error: 'Error interno del servidor' })
  }
}
