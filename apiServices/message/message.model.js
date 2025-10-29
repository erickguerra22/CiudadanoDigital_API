import { getConnection } from '../../db/connection.js'
import CustomError from '../../utils/customError.js'

export const createMessageModel = async ({ content, source, reference, chatId, responseTime }) => {
  const pool = await getConnection()
  const assigned = chatId !== undefined && chatId !== null

  const query = `
    INSERT INTO Mensaje (content, source, reference, chatId, assigned, responsetime)
    VALUES ($1, $2, $3, $4, $5, $6)
    RETURNING messageId, chatId, source, content, reference, timestamp, assigned, responsetime;
  `

  const values = [content, source, reference, chatId, assigned, responseTime]

  const { rows } = await pool.query(query, values)

  if (!rows || rows.length === 0) throw new CustomError('No se pudo crear el mensaje', 400)

  return rows[0]
}

export const getChatMessagesModel = async ({ chatId, limit, offset }) => {
  const pool = await getConnection()

  const query = `
    SELECT 
      messageId, 
      chatId, 
      source, 
      content,
      reference,
      timestamp,
      assigned,
      responsetime
    FROM Mensaje
    WHERE chatId = $1
      ORDER BY TIMESTAMP desc
      LIMIT $2
      OFFSET $3;`

  const { rows } = await pool.query(query, [chatId, limit, offset])

  if (!rows || rows.length === 0) {
    throw new CustomError('El chat está vacío.', 404)
  }

  return rows.reverse()
}

export const getMessageById = async (messageId) => {
  const pool = await getConnection()

  const query = `
    SELECT 
      messageId, 
      chatId, 
      source, 
      content,
      reference,
      timestamp,
      assigned
    FROM Mensaje
    WHERE messageId = $1
    LIMIT 1;`

  const { rows } = await pool.query(query, [messageId])

  if (!rows || rows.length === 0) {
    throw new CustomError('Mensaje no encontrado', 404)
  }

  return rows[0]
}

export const updateMessageModel = async (messageId, messageData) => {
  const currentMessage = await getMessageById(messageId)
  if (!currentMessage) throw new CustomError('Mensaje no encontrado', 404)

  const pool = await getConnection()
  const { chatId, source, content, reference, timestamp, assigned } = messageData

  const query = `
    UPDATE Mensaje set 
      chatId = $1,
      source = $2, 
      content = $3, 
      reference = $4, 
      timestamp = $5, 
      assigned = $6
    where messageid = $7
    RETURNING messageId, chatId, source, content, reference, timestamp, assigned;
  `

  const values = [
    chatId ?? currentMessage.chatId,
    source ?? currentMessage.source,
    content ?? currentMessage.content,
    reference ?? currentMessage.reference,
    timestamp ?? currentMessage.timestamp,
    assigned ?? currentMessage.assigned,
    messageId,
  ]

  const { rows } = await pool.query(query, values)

  if (!rows || rows.length === 0) throw new CustomError('No se pudo actualizar el mensaje', 400)

  return rows[0]
}
