import { createMessageModel, getChatMessagesModel, updateMessageModel } from './message.model.js'
import { getChatById } from '../chat/chat.model.js'
import { Logger } from '../../utils/logger.js'
import CustomError from '../../utils/customError.js'
import config from 'config'
import { exec } from 'child_process'
import { promisify } from 'util'
import { dirname, resolve } from 'path'
import { fileURLToPath } from 'url'

const filePath = fileURLToPath(import.meta.url)
const dirPath = dirname(filePath)

const execAsync = promisify(exec)
const logger = new Logger({ filename: 'message-controller.log' })

export const createMessage = async (req, res) => {
  try {
    const { content } = req.body
    const { chatId } = req.params

    const message = await createMessageModel({
      content,
      source: 'user',
      chatId,
    })

    if (!message) throw new CustomError('Ocurrió un error al crear el mensaje', 500)

    return res.status(201).json({
      message: 'mensaje creado correctamente.',
      chatMessage: message,
    })
  } catch (err) {
    logger.error(err.message, { title: 'Error en createMessage' })
    if (err instanceof CustomError) {
      return res.status(err.status).json({ error: err.message })
    }
    return res.status(500).json({ error: 'Error interno del servidor' })
  }
}

export const getChatMessages = async (req, res) => {
  try {
    const { sub } = req.user
    const { chatId } = req.params
    const { limit = 5, offset = 0 } = req.query

    const chat = await getChatById({ chatId })

    if (sub != chat.userid) throw new CustomError('No es posible obtener mensajes de otros usuarios.', 403)

    const messages = await getChatMessagesModel({
      chatId,
      limit,
      offset,
    })

    return res.status(200).json({
      messages,
    })
  } catch (err) {
    logger.error(err.message, { title: 'Error en getChatMessages' })

    if (err instanceof CustomError) {
      return res.status(err.status).json({ error: err.message })
    }
    return res.status(500).json({ error: 'Error interno del servidor' })
  }
}

export const assignMessage = async (req, res) => {
  try {
    const { sub } = req.user
    const { chatId, messageId } = req.params

    const chat = await getChatById({ chatId })

    if (sub != chat.userid) throw new CustomError('No se puede asignar el mensaje a un chat ajeno.', 403)

    const message = await updateMessageModel(messageId, { chatId, assigned: true })

    if (!message) throw new CustomError('Ocurrió un error al asignar el mensaje.', 400)

    return res.status(201).json({
      ...message,
    })
  } catch (err) {
    logger.error(err.message, { title: 'Error en assignMessage' })
    if (err instanceof CustomError) {
      return res.status(err.status).json({ error: err.message })
    }
    return res.status(500).json({ error: 'Error interno del servidor' })
  }
}

export const getResponse = async (req, res) => {
  try {
    const { question } = req.query
    const { chatId } = req.params

    if (!question) {
      throw new CustomError('No se proporcionó la pregunta', 400)
    }

    const venvPython = config.get('venvPython')
    const pythonPath = resolve(dirPath, `../../ciudadano_digital/${venvPython}`)
    const servicePath = resolve(dirPath, '../../services/questionsService/main.py')

    const pythonCommand = `"${pythonPath}" "${servicePath}" "${question}"`
    const startTime = Date.now()
    const { stdout, stderr } = await execAsync(pythonCommand)

    if (stderr) {
      logger.error(stderr, { title: 'Error al ejecutar Python' })
      throw new CustomError('No se pudo obtener la respuesta')
    }

    let responseData
    try {
      responseData = JSON.parse(stdout)
    } catch (parseErr) {
      logger.error(parseErr, { title: 'Error al parsear la respuesta de Python' })
      throw new CustomError('Respuesta inválida del servicio Python')
    }

    const elapsedMs = Date.now() - startTime

    const { response, reference, question: questionPy, category } = responseData

    logger.info(questionPy, { title: 'Pregunta enviada' })
    logger.info(category, { title: 'Categoría Recibida' })

    const message = await createMessageModel({
      content: response,
      source: 'assistant',
      reference,
      chatId,
    })

    message.responseTime = elapsedMs

    if (!message) throw new CustomError('Ocurrió un error al guardar el mensaje', 500)

    return res.status(201).json({
      message: 'Respuesta obtenida.',
      chatMessage: message,
    })
  } catch (err) {
    logger.error(err.message || err, { title: 'Error en getResponse' })

    if (err instanceof CustomError) {
      return res.status(err.status).json({ error: err.message })
    }

    return res.status(500).json({ error: 'Error interno del servidor' })
  }
}
