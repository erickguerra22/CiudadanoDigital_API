
import CustomError from '../../utils/customError.js';
import { loginModel, refreshTokenModel, logoutModel } from './auth.model.js';

export const loginController = async (req, res) => {
    try {
        const { email, password, deviceId } = req.body;
        const clientType = req.headers['x-client-type'] || 'web';

        const result = await loginModel(email, password, deviceId);

        if (clientType === 'web') {
            res.cookie('refreshToken', result.refreshToken, {
                httpOnly: true,
                secure: process.env.NODE_ENV === 'production',
                sameSite: 'strict',
                maxAge: result.refreshExpiresAt * 1000 - Date.now()
            });

            const { refreshToken, ...responseData } = result;
            res.json(responseData);
        } else {
            res.json(result);
        }
    } catch (err) {
        if (err instanceof CustomError) {
            return res.status(err.status).json({ error: err.message });
        }
        console.error('Login error:', err);
        res.status(500).json({ error: "Error interno del servidor" });
    }
}

export const refreshTokenController = async (req, res) => {
    try {
        const { userId, deviceId } = req.verifiedToken;
        const clientType = req.headers['x-client-type'] || 'web';
        const refreshToken =
            clientType === 'web' ?
                req.cookies.refreshToken : req.body.refreshToken;

        if (!refreshToken) {
            throw new CustomError("Refresh token no proporcionado", 401);
        }

        const result = await refreshTokenModel(userId, deviceId, refreshToken);

        res.json(result);
    } catch (err) {
        if (err instanceof CustomError) {
            return res.status(err.status).json({ error: err.message });
        }
        console.error('Refresh token error:', err);
        res.status(500).json({ error: "Error interno del servidor" });
    }
}

export const logoutController = async (req, res) => {
    try {
        const { userId, deviceId } = req.verifiedToken;
        const clientType = req.headers['x-client-type'] || 'web';
        const refreshToken =
            clientType === 'web' ?
                req.cookies.refreshToken : req.body.refreshToken;

        await logoutModel(userId, deviceId, refreshToken);
        res.clearCookie('refreshToken');

        res.json({ message: "Sesión cerrada exitosamente" });
    } catch (err) {
        if (err instanceof CustomError) {
            return res.status(err.status).json({ error: err.message });
        }
        console.error('Logout error:', err);
        res.status(500).json({ error: "Error interno del servidor" });
    }
}
