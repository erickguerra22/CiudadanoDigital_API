import { validateToken } from './jwt.js';
import CustomError from '../utils/customError.js';

export const verifyRefreshToken = async (req, res, next) => {
	try {
		const authHeader = req.headers.authorization;

		if (!authHeader || !authHeader.startsWith('Bearer ')) {
			throw new CustomError('Token no proporcionado', 401);
		}

		const token = authHeader.substring(7);

		// Verificar el access token (puede estar expirado, pero necesitamos los datos)
		const decoded = await validateToken(token, { ignoreExpiration: true });

		if (!decoded) {
			throw new CustomError('Token inválido', 401);
		}

		// Adjuntar los datos verificados a la request
		req.verifiedToken = {
			userId: decoded.userId,
			deviceId: decoded.deviceId,
			email: decoded.email,
		};

		next();
	} catch (err) {
		if (err instanceof CustomError) {
			return res.status(err.status).json({ error: err.message });
		}
		return res.status(401).json({ error: 'No autorizado' });
	}
};