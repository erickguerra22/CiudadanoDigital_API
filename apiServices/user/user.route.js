import express from 'express'
import { registerUser } from './user.controller.js'
import validateBody from '../../middlewares/validateBody.js'
import { createUserSchema } from './validationSchemas/createUserSchema.js'

const userRouter = express.Router()

userRouter.post('/', validateBody(createUserSchema), registerUser)

export default userRouter
