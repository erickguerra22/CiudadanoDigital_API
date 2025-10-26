import express from 'express'
import { registerUser, getLoggedUser, updateUser } from './user.controller.js'
import validateBody from '../../middlewares/validateBody.js'
import { createUserSchema } from './validationSchemas/user.create.schema.js'
import { updateUserSchema } from './validationSchemas/user.update.schema.js'
import { verifyAccessToken } from '../../middlewares/verifyAccessToken.middleware.js'

const userRouter = express.Router()

userRouter.post('/', validateBody(createUserSchema), registerUser)
userRouter.get('/logged', verifyAccessToken, getLoggedUser)
userRouter.put('/:userId', verifyAccessToken, validateBody(updateUserSchema), updateUser)

export default userRouter
