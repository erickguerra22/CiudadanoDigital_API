import { getConnection } from '../../db/connection.js'
import CustomError from '../../utils/customError.js'

export const createChatModel = async ({ userId, name }) => {
  const pool = await getConnection()

  const query = `
    INSERT INTO Chat (userid, nombre)
    VALUES ($1, $2)
    RETURNING chatId, userId, nombre;
  `

  const values = [userId, name]

  const { rows } = await pool.query(query, values)

  if (!rows || rows.length === 0) throw new CustomError('No se pudo crear el chat', 400)

  return rows[0]
}

export const getChatsModel = async ({ userId }) => {
  const pool = await getConnection()

  const query = `
    SELECT 
      chatId, 
      userId, 
      fechaInicio, 
      nombre
    FROM Chat
    WHERE userId = $1`

  const { rows } = await pool.query(query, [userId])

  if (!rows || rows.length === 0) {
    throw new CustomError('El usuario no cuenta con Chats.', 404)
  }

  return rows
}

export const getChatById = async ({ chatId }) => {
  const pool = await getConnection()

  const query = `
    SELECT 
      chatId, 
      userId, 
      fechaInicio, 
      nombre
    FROM Chat
    WHERE chatId = $1`

  const { rows } = await pool.query(query, [chatId])

  if (!rows || rows.length === 0) {
    throw new CustomError('El chat no existe.', 404)
  }

  return rows[0]
}
