import { createChatModel, getChatsModel } from './chat.model.js'
import { Logger } from '../../utils/logger.js'
import CustomError from '../../utils/customError.js'

const logger = new Logger({ filename: 'chat-controller.log' })

export const createChat = async (req, res) => {
  try {
    const { sub } = req.user
    const { name } = req.body

    const chat = await createChatModel({
      userId: sub,
      name,
    })

    if (!chat) throw new CustomError('Ocurrió un error al crear el chat', 500)

    return res.status(201).json({
      message: 'Chat creado correctamente.',
      chat,
    })
  } catch (err) {
    logger.error(err.message, { title: 'Error en createChat' })
    if (err instanceof CustomError) {
      return res.status(err.status).json({ error: err.message })
    }
    return res.status(500).json({ error: 'Error interno del servidor' })
  }
}

export const getChats = async (req, res) => {
  try {
    const { sub } = req.user

    const chats = await getChatsModel({ userId: sub })

    return res.status(200).json({
      chats,
    })
  } catch (err) {
    logger.error(err.message, { title: 'Error en getChats' })

    if (err instanceof CustomError) {
      return res.status(err.status).json({ error: err.message })
    }

    return res.status(500).json({ error: 'Error interno del servidor' })
  }
}
