import { createMessageModel, getChatHistory, getChatMessagesModel, getChatSummary, insertNewSummary, updateMessageModel } from './message.model.js'
import { createChatModel, getChatById } from '../chat/chat.model.js'
import { Logger } from '../../utils/logger.js'
import CustomError from '../../utils/customError.js'
import config from 'config'
import { spawn } from 'child_process'
import { dirname, resolve } from 'path'
import { fileURLToPath } from 'url'
import { getCategories, getCategoryByDescription } from '../document/document.model.js'
import { getUserById } from '../user/user.model.js'

const filePath = fileURLToPath(import.meta.url)
const dirPath = dirname(filePath)

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
    const { sub } = req.user
    const { question } = req.query
    const { chatId } = req.params

    if (!question) {
      throw new CustomError('No se proporcionó la pregunta', 400)
    }

    const categories = await getCategories()
    const user = await getUserById(sub)

    let edad = null
    if (user.birthdate) {
      const nacimiento = new Date(user.birthdate)
      if (!isNaN(nacimiento)) {
        const hoy = new Date()
        edad = hoy.getFullYear() - nacimiento.getFullYear()
        const mesDiff = hoy.getMonth() - nacimiento.getMonth()
        if (mesDiff < 0 || (mesDiff === 0 && hoy.getDate() < nacimiento.getDate())) {
          edad--
        }
      }
    }

    const venvPython = config.get('venvPython')
    const pythonPath = resolve(dirPath, `../../ciudadano_digital/${venvPython}`)
    const servicePath = resolve(dirPath, '../../services/questionsService/main.py')

    const chat = !chatId ? undefined : await getChatById({ chatId })
    const historial = !chatId ? [] : await getChatHistory({ chatId })
    const resumen = !chatId ? '' : await getChatSummary({ chatId })

    const payload = {
      question,
      chat: chat?.nombre ?? 'undefined',
      categories,
      historial,
      resumen,
      edad: Number(edad) || 0,
    }

    const py = spawn(pythonPath, [servicePath])

    py.stdin.write(JSON.stringify(payload))
    py.stdin.end()

    let stdout = ''
    let stderr = ''

    const startTime = Date.now()

    py.stdout.on('data', (data) => (stdout += data))
    py.stderr.on('data', (data) => (stderr += data))

    py.on('close', async (code) => {
      if (stderr || code !== 0) {
        logger.error(stderr, { title: 'Error al ejecutar Python' })
        return res.status(500).json({ error: 'No se pudo obtener la respuesta' })
      }

      let responseData
      try {
        responseData = JSON.parse(stdout)
      } catch (e) {
        logger.error(`${stdout} || ${e.message}`, { title: 'Respuesta inválida de Python' })
        return res.status(500).json({ error: 'Respuesta inválida del servicio Python' })
      }

      const elapsedMs = Date.now() - startTime
      const { response, reference, _, category, chatName, resumen: nuevoResumen } = responseData

      let newChat = null
      if (!chatId) {
        newChat = await createChatModel({
          userId: sub,
          name: chatName,
        })
      }

      await getCategoryByDescription(category)

      const message = await createMessageModel({
        content: response,
        source: 'assistant',
        reference,
        chatId: newChat?.chatid ?? chatId,
        responseTime: elapsedMs,
      })

      if (nuevoResumen) {
        await insertNewSummary({
          userId: sub,
          chatId: newChat?.chatid ?? chatId,
          content: nuevoResumen,
        })
      }

      return res.status(201).json({
        message: 'Respuesta obtenida.',
        newChat: newChat !== null,
        chatMessage: message,
      })
    })
  } catch (err) {
    logger.error(err.message || err, { title: 'Error en getResponse' })

    if (err instanceof CustomError) {
      return res.status(err.status).json({ error: err.message })
    }

    return res.status(500).json({ error: 'Error interno del servidor' })
  }
}
