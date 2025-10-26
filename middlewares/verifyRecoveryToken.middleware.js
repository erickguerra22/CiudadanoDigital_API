import { validateToken } from './jwt.js'
import CustomError from '../utils/customError.js'
import { Logger } from '../utils/logger.js'

const logger = new Logger({ filename: 'verify-recovery.txt' })

export const verifyRecoveryToken = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new CustomError('Token de recuperación no proporcionado', 401)
    }

    const token = authHeader.substring(7)

    const decoded = await validateToken(token)

    if (!decoded) {
      throw new CustomError('Token inválido', 401)
    }

    req.recovery = {
      userId: decoded.id,
    }

    next()
  } catch (err) {
    if (err instanceof CustomError) {
      return res.status(err.status).json({ error: err.message })
    }
    logger.error(err.message, { title: 'Error al verificar token de Recuperación' })
    return res.status(401).json({ error: 'No autorizado' })
  }
}
