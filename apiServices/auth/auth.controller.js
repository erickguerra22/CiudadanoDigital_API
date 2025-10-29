import CustomError from '../../utils/customError.js'
import { loginModel, refreshTokenModel, logoutModel, storeRecoveryCode, getRecoveryCode, deleteRecoveryCode, resetPasswordModel } from './auth.model.js'
import { Logger } from '../../utils/logger.js'
import { getUserByEmail } from '../user/user.model.js'
import bcrypt from 'bcryptjs'
import moment from 'moment'
import { sendEmail } from '../../services/email.service.js'
import crypto from 'crypto'
import { signRecoverPasswordToken } from '../../middlewares/jwt.js'
import consts from '../../utils/consts.js'

const logger = new Logger({ filename: 'auth-controller.log' })

export const loginController = async (req, res) => {
  try {
    const { email, password, deviceId } = req.body
    const clientType = req.headers['x-client-type'] || 'web'

    const result = await loginModel(email, password, deviceId)

    if (clientType === 'web') {
      res.cookie('refreshToken', result.refreshToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict',
        maxAge: result.refreshExpiresAt * 1000 - Date.now(),
      })

      const { refreshToken: _refreshToken, ...responseData } = result
      res.json(responseData)
    } else {
      res.json(result)
    }
  } catch (err) {
    if (err instanceof CustomError) {
      return res.status(err.status).json({ error: err.message })
    }
    logger.error(err.message, { title: 'Login error' })
    res.status(500).json({ error: 'Error interno del servidor' })
  }
}

export const refreshTokenController = async (req, res) => {
  try {
    const { sub, deviceId } = req.user
    const clientType = req.headers['x-client-type'] || 'web'
    const refreshToken = clientType === 'web' ? req.cookies.refreshToken : req.body.refreshToken

    if (!refreshToken) {
      throw new CustomError('Refresh token no proporcionado', 401)
    }

    const result = await refreshTokenModel(sub, deviceId, refreshToken)

    res.json(result)
  } catch (err) {
    if (err instanceof CustomError) {
      return res.status(err.status).json({ error: err.message })
    }
    logger.error(err.message, { title: 'Refresh token error' })
    res.status(500).json({ error: 'Error interno del servidor' })
  }
}

export const logoutController = async (req, res) => {
  try {
    const { sub, deviceId } = req.user
    const clientType = req.headers['x-client-type'] || 'web'
    const refreshToken = clientType === 'web' ? req.cookies.refreshToken : req.body.refreshToken

    await logoutModel(sub, deviceId, refreshToken)
    res.clearCookie('refreshToken')

    res.json({ message: 'Sesión cerrada exitosamente' })
  } catch (err) {
    if (err instanceof CustomError) {
      return res.status(err.status).json({ error: err.message })
    }
    logger.error(err.message, { title: 'Logout error' })
    res.status(500).json({ error: 'Error interno del servidor' })
  }
}

export const requestRecoveryCode = async (req, res) => {
  try {
    const { email } = req.body

    const user = await getUserByEmail(email)

    if (!user) {
      logger.error('Intento de recuperación con email inexistente: ' + email, { title: 'requestRecoveryCode' })
      return res.status(200).json({ message: 'Si el correo existe, se envió un código de recuperación.' })
    }

    const code = crypto.randomInt(100000, 999999).toString()

    const salt = await bcrypt.genSalt(10)
    const codeHash = await bcrypt.hash(code, salt)

    const expiresAt = moment().add(15, 'minutes').toDate()

    await storeRecoveryCode(user.userid, codeHash, expiresAt)

    await sendEmail({
      to: email,
      subject: 'Código de recuperación de contraseña',
      html: `<p>Tu código de recuperación es: <b>${code}</b>. Expira en 15 minutos.</p>`,
    })

    return res.status(200).json({ message: 'Si el correo existe, se envió un código de recuperación.' })
  } catch (err) {
    logger.error(err.message, { title: 'Error en requestRecoveryCode' })
    if (err instanceof CustomError) return res.status(err.status).json({ error: err.message })
    return res.status(500).json({ error: 'Error interno del servidor.' })
  }
}

export const verifyRecoveryCode = async (req, res) => {
  try {
    const { email, code } = req.body

    const user = await getUserByEmail(email)
    if (!user) {
      return res.status(400).json({ error: 'Código inválido o expirado.' })
    }

    const codeData = await getRecoveryCode(user.userid)
    if (!codeData) {
      return res.status(400).json({ error: 'Código inválido o expirado.' })
    }

    if (new Date() > codeData.expiresat) {
      return res.status(400).json({ error: 'Código inválido o expirado.' })
    }

    const isValid = await bcrypt.compare(code.toString(), codeData.codehash)
    if (!isValid) {
      return res.status(400).json({ error: 'Código inválido o expirado.' })
    }

    const { token, expiresAt } = signRecoverPasswordToken({
      id: user.userid,
      name: user.names,
      lastname: user.lastnames,
      email: user.email,
    })

    await sendEmail({
      to: email,
      subject: 'Verificación de código exitosa',
      html: `<p>Tienes solamente ${consts.tokenExpiration.recover_minutes_expiration} ${
        consts.tokenExpiration.recover_minutes_expiration > 1 ? 'minutos' : 'minuto'
      } para reestablecer tu contraseña.</p>`,
    })

    await deleteRecoveryCode(user.userid)

    return res.status(200).json({
      token,
      expiresAt,
      message: `Tienes en ${consts.tokenExpiration.recover_minutes_expiration} ${consts.tokenExpiration.recover_minutes_expiration > 1 ? 'munitos' : 'minuto'} para establecer una nueva contraseña.`,
    })
  } catch (err) {
    logger.error(err.message, { title: 'Error en requestRecoveryCode' })
    if (err instanceof CustomError) return res.status(err.status).json({ error: err.message })
    return res.status(500).json({ error: 'Error interno del servidor.' })
  }
}

export const recoverPassword = async (req, res) => {
  try {
    const { password } = req.body

    const { userId } = req.recovery

    await resetPasswordModel(userId, password)

    return res.status(200).json({ message: 'Contraseña actualizada correctamente.' })
  } catch (err) {
    logger.error(err.message, { title: 'Error al actualizar contraseña' })
    res.status(500).json({ error: 'Error interno del servidor.' })
  }
}
