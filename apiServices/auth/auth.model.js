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
    `SELECT userId, email, names, lastnames, password, role
             FROM Usuario WHERE email = $1`,
    [email]
  )
  if (rows.length === 0) throw new CustomError('Credenciales incorrectas', 401)

  const user = rows[0]
  const isMatch = await bcrypt.compare(password, user.password)
  if (!isMatch) throw new CustomError('Credenciales incorrectas', 401)

  delete user.password

  const refreshToken = uuidv4()
  const refreshTokenId = uuidv4()
  const refreshTokenHash = sha256(refreshToken.trim())
  const refreshExpiresAt = moment().add(consts.tokenExpiration.refresh_days_expiration, 'day').unix()

  const { token, expiresAt } = signAccessToken({
    userId: user.userid,
    deviceId,
    email: user.email,
    names: user.names,
    lastnames: user.lastnames,
    refreshId: refreshTokenId,
    role: user.role,
  })

  await revokeToken(user.userid, deviceId)
  await storeRefresh(user.userid, deviceId, refreshTokenHash, moment().add(consts.tokenExpiration.refresh_days_expiration, 'day').toDate(), refreshTokenId)

  return { token, expiresAt, refreshToken, refreshExpiresAt }
}

export const storeRefresh = async (userId, deviceId, refreshToken, expiresAt, refreshTokenId) => {
  const pool = await getConnection()

  const querySelect = 'SELECT refreshtoken, expiresat FROM Sesion WHERE userId = $1 AND deviceId = $2 AND revoked = false'
  const valuesSelect = [userId, deviceId]
  const { rows: foundTokens } = await pool.query(querySelect, valuesSelect)
  if (foundTokens.length !== 0) {
    return {
      refreshToken: foundTokens[0].refreshtoken,
      expiresAt: foundTokens[0].expiresat,
    }
  }

  const query = `INSERT INTO Sesion (userId, deviceId, refreshToken, expiresAt, refreshId)
                  VALUES ($1, $2, $3, $4, $5)
                RETURNING userId, refreshToken, expiresAt;`

  const values = [userId, deviceId, refreshToken, expiresAt, refreshTokenId]

  const { rows } = await pool.query(query, values)
  if (rows.length === 0) {
    throw new CustomError('No se pudo almacenar el refresh token', 500)
  }
  const created = rows[0]

  return {
    refreshToken: created.refreshtoken,
    expiresAt: created.expiresat,
  }
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
  const { rows } = await pool.query(`SELECT userId, email, names, lastnames, role FROM Usuario WHERE userId = $1`, [userId])

  const user = rows[0] || null

  if (!user) throw new CustomError('Usuario no encontrado', 404)

  const newRefreshToken = uuidv4()
  const refreshTokenId = uuidv4()
  const newRefreshTokenHash = sha256(newRefreshToken.trim())
  const refreshExpiresAt = moment().add(consts.tokenExpiration.refresh_days_expiration, 'day').unix()

  const { token, expiresAt } = signAccessToken({
    userId: user.userid,
    deviceId,
    email: user.email,
    names: user.names,
    lastnames: user.lastnames,
    refreshId: refreshTokenId,
    role: user.role,
  })

  await revokeToken(user.userid, deviceId)
  await storeRefresh(user.userid, deviceId, newRefreshTokenHash, moment().add(consts.tokenExpiration.refresh_days_expiration, 'day').toDate(), refreshTokenId)

  return { token, expiresAt, refreshToken: newRefreshToken, refreshExpiresAt }
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
             WHERE userId = $1 AND deviceId = $2`,
    [userId, deviceId]
  )
}

export const storeRecoveryCode = async (userId, codeHash, expiresAt) => {
  const pool = await getConnection()

  const query = `
    INSERT INTO CodigoRecuperacion (userId, codeHash, expiresAt)
      VALUES ($1, $2, $3)
    ON CONFLICT (userId)
      DO UPDATE SET codeHash = $2, expiresAt = $3, createdAt = NOW();`
  await pool.query(query, [userId, codeHash, expiresAt])
}

export const getRecoveryCode = async (userId) => {
  const pool = await getConnection()
  const query = `SELECT * FROM CodigoRecuperacion WHERE userId = $1`
  const result = await pool.query(query, [userId])
  return result.rows[0] || null
}

export const deleteRecoveryCode = async (userId) => {
  const pool = await getConnection()
  const query = `DELETE FROM CodigoRecuperacion WHERE userId = $1`
  await pool.query(query, [userId])
}

export const resetPasswordModel = async (userId, newPassword) => {
  const pool = await getConnection()
  const salt = await bcrypt.genSalt(10)
  const hashedPassword = await bcrypt.hash(newPassword, salt)

  await pool.query(`UPDATE Usuario SET password = $1 WHERE userid = $2`, [hashedPassword, userId])
  await deleteRecoveryCode(userId)
  await pool.query(`UPDATE Sesion SET revoked = true, revokedat = NOW() WHERE userid = $1`, [userId])
  return true
}

export const verifyRefreshToken = async (refreshTokenId) => {
  const pool = await getConnection()
  const result = await pool.query(`SELECT * FROM Sesion WHERE refreshid = $1 AND revoked = false`, [refreshTokenId])
  if (result.rowCount === 0) return false
  return true
}
