import { validateToken } from './jwt.js'
import CustomError from '../utils/customError.js'
import { Logger } from '../utils/logger.js'
import { verifyRefreshToken } from '../apiServices/auth/auth.model.js'

const logger = new Logger({ filename: 'verify-access.txt' })

export const verifyAccessToken = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new CustomError('Token no proporcionado', 401)
    }

    const token = authHeader.substring(7)

    // Verificar el access token normalmente (sin ignorar expiración)
    const decoded = await validateToken(token)

    if (!decoded) {
      throw new CustomError('Token inválido', 401)
    }

    const validRefresh = await verifyRefreshToken(decoded.refreshId)
    if (!validRefresh) throw new CustomError('Token inválido', 401)

    // Adjuntar los datos verificados a la request
    req.user = {
      sub: decoded.userId,
      deviceId: decoded.deviceId,
      email: decoded.email,
      role: decoded.role,
    }

    next()
  } catch (err) {
    if (err instanceof CustomError) {
      return res.status(err.status).json({ error: err.message })
    }
    logger.error(err.message, { title: 'Error al verificar token de Acceso' })
    return res.status(401).json({ error: 'No autorizado' })
  }
}
