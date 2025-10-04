import { UserRepository } from "../../infrastructure/db/user.repository.js";
import { RefreshTokenRepository } from "../../infrastructure/db/refreshToken.repository.js";
import { signAccessToken } from "../../infrastructure/security/jwt.js";
import CustomError from '../../shared/custom.error.js';
import { v4 as uuidv4 } from 'uuid';
import sha256 from 'js-sha256';
import moment from 'moment';
import { generalConstants } from "../../shared/constants/general.js";

export class AuthService {
    constructor() {
        this.userRepository = new UserRepository();
        this.refreshTokenRepository = new RefreshTokenRepository();
    }

    async login(email, password, deviceId) {
        const user = await this.userRepository.verifyCredentials({ email, password });

        if (!user) {
            throw new CustomError("Credenciales incorrectas", 401);
        }

        return await this._generateTokens(user, deviceId);
    }

    async refreshAccessToken(userId, deviceId, refreshToken) {
        // Verificar que el refresh token existe y es válido
        const storedToken = await this.refreshTokenRepository.getTokenByUserAndDevice(
            userId, 
            deviceId
        );

        if (!storedToken) {
            throw new CustomError("Sesión inválida", 401);
        }

        const refreshTokenHash = sha256(refreshToken);

        // Verificar que el hash coincide
        if (storedToken.refreshtoken !== refreshTokenHash) {
            throw new CustomError("Token de actualización inválido", 401);
        }

        // Verificar que no esté revocado
        if (storedToken.revoked) {
            throw new CustomError("Token revocado", 401);
        }

        // Verificar que no esté expirado
        if (new Date(storedToken.expiresat) < new Date()) {
            await this.refreshTokenRepository.revokeSessionToken(userId, deviceId);
            throw new CustomError("Token expirado", 401);
        }

        // Obtener datos del usuario
        const user = await this.userRepository.getUserById(userId);

        if (!user) {
            throw new CustomError("Usuario no encontrado", 404);
        }

        // Generar nuevo access token
        const { token, expiresAt } = signAccessToken({
            userId: user.userid,
            deviceId: deviceId,
            email: user.email,
            names: user.names,
            lastnames: user.lastnames,
        });

        return {
            token,
            expiresAt
        };
    }

    async logout(userId, deviceId, refreshToken) {
        // Validar que el token pertenece al usuario
        const storedToken = await this.refreshTokenRepository.getTokenByUserAndDevice(
            userId,
            deviceId
        );

        if (!storedToken) {
            throw new CustomError("Sesión no encontrada", 404);
        }

        const refreshTokenHash = sha256(refreshToken);

        if (storedToken.refreshtoken !== refreshTokenHash) {
            throw new CustomError("Token inválido", 401);
        }

        // Revocar el token
        await this.refreshTokenRepository.revokeSessionToken(userId, deviceId);

        return true;
    }

    async _generateTokens(user, deviceId) {
        const { token, expiresAt } = signAccessToken({
            userId: user.userid,
            deviceId: deviceId,
            email: user.email,
            names: user.names,
            lastnames: user.lastnames,
        });

        const refreshToken = uuidv4();
        const refreshTokenHash = sha256(refreshToken);
        const refreshExpiresAt = moment()
            .add(generalConstants.tokenExpiration.refresh_days_expiration, 'day')
            .unix();

        // Revocar tokens anteriores del mismo dispositivo
        await this.refreshTokenRepository.revokeSessionToken(user.userid, deviceId);

        // Guardar nuevo Refresh Token
        await this.refreshTokenRepository.storeRefresh({
            userId: user.userid,
            deviceId,
            refreshToken: refreshTokenHash,
            expiresAt: new Date(refreshExpiresAt * 1000)
        });

        return {
            token,
            expiresAt,
            refreshToken,
            refreshExpiresAt
        };
    }

    async cleanExpiredTokens() {
        await this.refreshTokenRepository.deleteExpiredTokens();
    }
}