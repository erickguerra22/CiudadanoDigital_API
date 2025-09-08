import { pool } from '../../db/connection.js';
import bcrypt from 'bcryptjs';
import CustomError from '../../utils/customError.js';

export const verifyCredentials = async ({ email, password }) => {
    const query = 'SELECT userId, email, names, lastnames, birthdate, phoneCode, phoneNumber, password FROM Usuario WHERE email = $1';
    const values = [email];
    const { rows } = await pool.query(query, values);
    if (rows.length === 0) {
        throw new CustomError('Credenciales incorrectas', 401);
    }
    const user = rows[0];
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
        throw new CustomError('Credenciales incorrectas', 401);
    }
    delete user.password;
    return user;
}

export const storeRefresh = async ({
    userId, deviceId, refreshToken, expiresAt,
}) => {

    const querySelect = 'SELECT refreshtoken, expiresat FROM Sesion WHERE userId = $1 AND deviceId = $2';
    const valuesSelect = [userId, deviceId];
    const { rows: foundTokens } = await pool.query(querySelect, valuesSelect);
    if (foundTokens.length !== 0) {
        return {
            refreshToken: foundTokens[0].refreshtoken,
            expiresAt: foundTokens[0].expiresat
        };
    }

    const query = `
    INSERT INTO Sesion (userId, deviceId, refreshToken, expiresAt)
    VALUES ($1, $2, $3, $4)
    RETURNING userId, refreshToken, expiresAt;
  `;

    const values = [userId, deviceId, refreshToken, expiresAt];

    const { rows } = await pool.query(query, values);
    if (rows.length === 0) {
        throw new CustomError('No se pudo almacenar el refresh token', 500);
    }
    const created = rows[0];

    return {
        refreshToken: created.refreshtoken,
        expiresAt: created.expiresat
    };
};
