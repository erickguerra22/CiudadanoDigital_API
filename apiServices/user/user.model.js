import { getConnection } from '../../db/connection.js'
import CustomError from '../../utils/customError.js'

export const createUser = async (userData) => {
  const pool = await getConnection()
  const { email, names, lastnames, birthdate, phoneCode, phoneNumber, passwordHash } = userData

  const query = `
    INSERT INTO Usuario (email, names, lastnames, birthdate, phoneCode, phoneNumber, password)
    VALUES ($1, $2, $3, $4, $5, $6, $7)
    RETURNING userId, email, names, lastnames, birthdate, phoneCode, phoneNumber;
  `

  const values = [email, names, lastnames, birthdate, phoneCode, phoneNumber, passwordHash]

  const { rows } = await pool.query(query, values)

  if (!rows || rows.length === 0) throw new CustomError('No se pudo crear el usuario', 400)

  return rows[0]
}

export const getUserById = async (userId) => {
  const pool = await getConnection()

  const query = `
    SELECT 
      userId, 
      email, 
      names, 
      lastnames, 
      birthdate, 
      phoneCode, 
      phoneNumber
    FROM Usuario
    WHERE userId = $1
    LIMIT 1;`

  const { rows } = await pool.query(query, [userId])

  if (!rows || rows.length === 0) {
    throw new CustomError('Usuario no encontrado', 404)
  }

  return rows[0]
}

export const updateUserModel = async (userId, userData) => {
  const currentUser = await getUserById(userId)
  if (!currentUser) throw new CustomError('Usuario no encontrado', 404)

  const pool = await getConnection()
  const { email, names, lastnames, birthdate, phoneCode, phoneNumber } = userData

  const query = `
    UPDATE Usuario set 
      email = $1,
      names = $2, 
      lastnames = $3, 
      birthdate = $4, 
      phoneCode = $5, 
      phoneNumber = $6
    where userid = $7
    RETURNING userId, email, names, lastnames, birthdate, phoneCode, phoneNumber;
  `

  const values = [
    email ?? currentUser.email,
    names ?? currentUser.names,
    lastnames ?? currentUser.lastnames,
    birthdate ?? currentUser.birthdate,
    phoneCode ?? currentUser.phonecode,
    phoneNumber ?? currentUser.phonenumber,
    userId,
  ]

  const { rows } = await pool.query(query, values)

  if (!rows || rows.length === 0) throw new CustomError('No se pudo actualizar el usuario', 400)

  return rows[0]
}

export const getUserByEmail = async (email) => {
  const pool = await getConnection()

  const query = `
    SELECT 
      userId, 
      email, 
      names, 
      lastnames, 
      birthdate, 
      phoneCode, 
      phoneNumber
    FROM Usuario
    WHERE email = $1
    LIMIT 1;`

  const { rows } = await pool.query(query, [email])

  if (!rows || rows.length === 0) {
    return undefined
  }

  return rows[0]
}
