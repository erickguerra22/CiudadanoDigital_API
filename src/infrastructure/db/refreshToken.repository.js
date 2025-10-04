import CustomError from "../../shared/custom.error.js";
import { getConnection } from "./database.js";

export class RefreshTokenRepository {
  async storeRefresh({ userId, deviceId, refreshToken, expiresAt }) {
    const pool = await getConnection();
    
    try {
      const query = `
        INSERT INTO Sesion (userId, deviceId, refreshToken, expiresAt, revoked)
        VALUES ($1, $2, $3, $4, false)
        RETURNING userId, deviceId, refreshToken, expiresAt, revoked;
      `;
      const values = [userId, deviceId, refreshToken, expiresAt];

      const { rows } = await pool.query(query, values);
      
      if (rows.length === 0) {
        throw new CustomError('No se pudo almacenar el refresh token', 500);
      }

      return rows[0];
    } catch (err) {
      if (err.code === '23505') {
        throw new CustomError('Ya existe una sesión activa para este dispositivo', 409);
      }
      throw err;
    }
  }

  async getTokenByUserAndDevice(userId, deviceId) {
    const pool = await getConnection();
    
    const query = `
      SELECT userId, deviceId, refreshToken, expiresAt, revoked, createdAt
      FROM Sesion 
      WHERE userId = $1 AND deviceId = $2
      ORDER BY createdAt DESC
      LIMIT 1;
    `;
    const values = [userId, deviceId];

    const { rows } = await pool.query(query, values);
    return rows[0] || null;
  }

  async revokeSessionToken(userId, deviceId) {
    const pool = await getConnection();
    
    const query = `
      UPDATE Sesion 
      SET revoked = true, revokedAt = NOW()
      WHERE userId = $1 AND deviceId = $2 AND revoked = false;
    `;
    const values = [userId, deviceId];

    await pool.query(query, values);
  }

  async revokeAllUserSessions(userId) {
    const pool = await getConnection();
    
    const query = `
      UPDATE Sesion 
      SET revoked = true, revokedAt = NOW()
      WHERE userId = $1 AND revoked = false;
    `;
    const values = [userId];

    await pool.query(query, values);
  }

  async deleteExpiredTokens() {
    const pool = await getConnection();
    
    const query = `
      DELETE FROM Sesion 
      WHERE expiresAt < NOW() OR (revoked = true AND revokedAt < NOW() - INTERVAL '30 days');
    `;

    const { rowCount } = await pool.query(query);
    return rowCount;
  }

  async getUserActiveSessions(userId) {
    const pool = await getConnection();
    
    const query = `
      SELECT deviceId, createdAt, expiresAt
      FROM Sesion 
      WHERE userId = $1 AND revoked = false AND expiresAt > NOW()
      ORDER BY createdAt DESC;
    `;
    const values = [userId];

    const { rows } = await pool.query(query, values);
    return rows;
  }
}