import express from 'express'
import { createMessage, getChatMessages, assignMessage, getResponse } from './message.controller.js'
import validateBody from '../../middlewares/validateBody.js'
import { createMessageSchema } from './validationSchemas/message.create.schema.js'
import { verifyAccessToken } from '../../middlewares/verifyAccessToken.middleware.js'

const messageRouter = express.Router()

messageRouter.get('/response/:chatId', verifyAccessToken, getResponse)
messageRouter.get('/response/', verifyAccessToken, getResponse)
messageRouter.post('/:chatId', verifyAccessToken, validateBody(createMessageSchema), createMessage)
messageRouter.post('/', verifyAccessToken, validateBody(createMessageSchema), createMessage)
messageRouter.get('/:chatId', verifyAccessToken, getChatMessages) // Con Paginación
messageRouter.put('/:messageId/:chatId', verifyAccessToken, assignMessage)

export default messageRouter
