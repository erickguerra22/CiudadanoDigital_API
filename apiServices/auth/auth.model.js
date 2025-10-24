import CustomError from '../../utils/customError.js'
import { getConnection } from '../../db/connection.js'
import { v4 as uuidv4 } from 'uuid'
import sha256 from 'js-sha256'
import moment from 'moment'
import bcrypt from 'bcryptjs'
import consts from '../../utils/consts.js'
import { signAccessToken } from '../../middlewares/jwt.js'

export const loginModel = async (email, password, deviceId) => {
  const pool = await getConnection()
  const { rows } = await pool.query(
    `SELECT userId, email, names, lastnames, password
             FROM Usuario WHERE email = $1`,
    [email]
  )
  if (rows.length === 0) throw new CustomError('Credenciales incorrectas', 401)

  const user = rows[0]
  const isMatch = await bcrypt.compare(password, user.password)
  if (!isMatch) throw new CustomError('Credenciales incorrectas', 401)

  delete user.password
  const { token, expiresAt } = signAccessToken({
    userId: user.userid,
    deviceId,
    email: user.email,
    names: user.names,
    lastnames: user.lastnames,
  })

  const refreshToken = uuidv4()
  const refreshTokenHash = sha256(refreshToken.trim())
  const refreshExpiresAt = moment().add(consts.tokenExpiration.refresh_days_expiration, 'day').unix()

  await revokeToken(user.userid, deviceId)
  await pool.query(
    `INSERT INTO Sesion (userId, deviceId, refreshToken, expiresAt, revoked)
             VALUES ($1, $2, $3, $4, false)`,
    [user.userid, deviceId, refreshTokenHash, new Date(refreshExpiresAt * 1000)]
  )

  return { token, expiresAt, refreshToken, refreshExpiresAt }
}

export const refreshTokenModel = async (userId, deviceId, refreshToken) => {
  const storedToken = await getToken(userId, deviceId)

  if (!storedToken) throw new CustomError('Sesión inválida', 401)

  const refreshTokenHash = sha256(refreshToken)

  if (storedToken.refreshtoken !== refreshTokenHash) throw new CustomError('Token de actualización inválido', 401)
  if (storedToken.revoked) throw new CustomError('Token revocado', 401)
  if (new Date(storedToken.expiresat) < new Date()) {
    await revokeToken(userId, deviceId)
    throw new CustomError('Token expirado', 401)
  }

  const pool = await getConnection()
  const { rows } = await pool.query(`SELECT userId, email, names, lastnames FROM Usuario WHERE userId = $1`, [userId])

  const user = rows[0] || null

  if (!user) throw new CustomError('Usuario no encontrado', 404)

  const { token, expiresAt } = signAccessToken({
    userId: user.userid,
    deviceId,
    email: user.email,
    names: user.names,
    lastnames: user.lastnames,
  })

  return { token, expiresAt }
}

export const logoutModel = async (userId, deviceId, refreshToken) => {
  const storedToken = await getToken(userId, deviceId)
  if (!storedToken) throw new CustomError('Sesión no encontrada', 404)

  const refreshTokenHash = sha256(refreshToken.trim())
  if (storedToken.refreshtoken !== refreshTokenHash) throw new CustomError('Token inválido', 401)

  await revokeToken(userId, deviceId)
  return true
}

const getToken = async (userId, deviceId) => {
  const pool = await getConnection()
  const { rows } = await pool.query(
    `SELECT userId, deviceId, refreshToken, expiresAt, revoked
             FROM Sesion 
             WHERE userId = $1 AND deviceId = $2 AND revoked = false
             ORDER BY createdAt DESC
             LIMIT 1`,
    [userId, deviceId]
  )
  return rows[0] || null
}

const revokeToken = async (userId, deviceId) => {
  const pool = await getConnection()
  await pool.query(
    `UPDATE Sesion SET revoked = true, revokedAt = NOW()
             WHERE userId = $1 AND deviceId = $2 AND revoked = false`,
    [userId, deviceId]
  )
}
