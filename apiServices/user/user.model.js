import { pool } from '../../db/connection.js';

export const createUser = async (userData) => {
  const {
    email,
    names,
    lastnames,
    birthdate,
    phoneCode,
    phoneNumber,
    passwordHash
  } = userData;

  const query = `
    INSERT INTO Usuario (email, names, lastnames, birthdate, phoneCode, phoneNumber, password)
    VALUES ($1, $2, $3, $4, $5, $6, $7)
    RETURNING userId, email, names, lastnames, birthdate, phoneCode, phoneNumber;
  `;

  const values = [email, names, lastnames, birthdate, phoneCode, phoneNumber, passwordHash];

  const { rows } = await pool.query(query, values);
  return rows[0];
};
