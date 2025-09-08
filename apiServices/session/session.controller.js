import { verifyCredentials, storeRefresh } from './session.model.js';
import { signAccessToken } from '../../services/jwt.js';
import consts from '../../utils/consts.js';
import { v4 as uuidv4 } from 'uuid';
import sha256 from 'js-sha256';
import moment from 'moment';
import CustomError from '../../utils/customError.js';

export const loginController = async (req, res) => {
    try {
        const { email, password, deviceId } = req.body;

        const user = await verifyCredentials({
            email,
            password
        });

        if (!user) {
            return res.status(401).json({ error: 'Credenciales incorrectas' });
        }

        // Generar access token
        const { token, expiresAt } = signAccessToken({
            userId: user.userid,
            email: user.email,
            names: user.names,
            lastnames: user.lastnames,
        });

        // Generar refresh token y almacenarlo en la base de datos
        const refreshToken = uuidv4();
        const refreshTokenHash = sha256(refreshToken).toString();
        const refreshExpiresAt = moment.utc()
            .add(consts.tokenExpiration.refresh_days_expiration, 'day')
            .toDate();

        const { refreshToken: storedRefreshToken, expiresAt: storedExpiresAt } = await storeRefresh({
            userId: user.userid,
            deviceId,
            refreshToken: refreshTokenHash,
            expiresAt: refreshExpiresAt
        });

        const refreshExpires = Math.floor(new Date(storedExpiresAt).getTime() / 1000)

        return res.status(201).json({
            token,
            expiresAt,
            refreshToken: storedRefreshToken,
            refreshExpiresAt: refreshExpires,
        });
    } catch (err) {
        console.error('Error en loginController:', err);
        if (err instanceof CustomError) {
            return res.status(err.status).json({ error: err.message });
        }
        return res.status(500).json({ error: 'Error interno del servidor' });
    }
};
