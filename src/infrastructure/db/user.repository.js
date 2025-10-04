import CustomError from "../../shared/custom.error.js";
import { getConnection } from "./database.js";
import bcrypt from 'bcryptjs';

export class UserRepository {
    async verifyCredentials({ email, password }) {
        const pool = await getConnection();
        
        const query = `
            SELECT userId, email, names, lastnames, birthdate, phoneCode, phoneNumber, password
            FROM Usuario 
            WHERE email = $1;
        `;
        const values = [email];
        
        const { rows } = await pool.query(query, values);
        
        if (rows.length === 0) {
            // No revelar si el usuario existe o no
            throw new CustomError('Credenciales incorrectas', 401);
        }
        
        const user = rows[0];
        
        // Comparar contraseñas de forma segura
        const isMatch = await bcrypt.compare(password, user.password);
        
        if (!isMatch) {
            throw new CustomError('Credenciales incorrectas', 401);
        }
        
        // Remover información sensible
        delete user.password;
        
        return user;
    }

    async getUserById(userId) {
        const pool = await getConnection();
        
        const query = `
            SELECT userId, email, names, lastnames, birthdate, phoneCode, phoneNumber
            FROM Usuario 
            WHERE userId = $1;
        `;
        const values = [userId];
        
        const { rows } = await pool.query(query, values);
        
        if (rows.length === 0) {
            return null;
        }
        
        return rows[0];
    }

    async updateLastLogin(userId) {
        const pool = await getConnection();
        
        const query = `
            UPDATE Usuario 
            SET lastLoginAt = NOW()
            WHERE userId = $1;
        `;
        const values = [userId];
        
        await pool.query(query, values);
    }
}