import express from 'express'
import { createChat, getChats } from './chat.controller.js'
import validateBody from '../../middlewares/validateBody.js'
import { createChatSchema } from './validationSchemas/chat.create.schema.js'
import { verifyAccessToken } from '../../middlewares/verifyAccessToken.middleware.js'

const chatRouter = express.Router()

chatRouter.post('/', verifyAccessToken, validateBody(createChatSchema), createChat)
chatRouter.get('/', verifyAccessToken, getChats)

export default chatRouter
