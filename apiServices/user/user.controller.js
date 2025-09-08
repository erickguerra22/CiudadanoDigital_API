import bcrypt from 'bcryptjs';
import { createUser } from './user.model.js';
import { storeRefresh } from '../session/session.model.js';
import { signAccessToken } from '../../services/jwt.js';
import consts from '../../utils/consts.js';
import { v4 as uuidv4 } from 'uuid';
import sha256 from 'js-sha256';
import moment from 'moment';
import CustomError from '../../utils/customError.js';

export const registerUser = async (req, res) => {
    try {
        const { email, names, lastnames, birthdate, phoneCode, phoneNumber, password, deviceId } = req.body;

        const salt = await bcrypt.genSalt(10);
        const passwordHash = await bcrypt.hash(password, salt);

        const user = await createUser({
            email,
            names,
            lastnames,
            birthdate,
            phoneCode,
            phoneNumber,
            passwordHash
        });

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

        return res.status(201).json({
            token,
            expiresAt,
            refreshToken: storedRefreshToken,
            refreshExpiresAt: Math.floor(new Date(storedExpiresAt).getTime() / 1000),
        });
    } catch (err) {
        console.error('Error en registerUser:', err);
        if (err instanceof CustomError) {
            return res.status(err.status).json({ error: err.message });
        }
        if (err.code === '23505') {
            return res.status(409).json({ error: 'El correo electrónico o el número de teléfono ya están en uso' });
        }
        return res.status(500).json({ error: 'Error interno del servidor' });
    }
};
