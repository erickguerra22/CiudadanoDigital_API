import express from 'express'
import validateBody from '../../middlewares/validateBody.js'
import { loginSchema } from './validationSchemas/auth.login.schema.js'
import { refreshTokenSchema } from './validationSchemas/auth.refreshToken.schema.js'
import { loginController, refreshTokenController, logoutController } from './auth.controller.js'
import { verifyRefreshToken } from '../../middlewares/verifyRefreshToken.middleware.js'

const authRouter = express.Router()

authRouter.post('/login', validateBody(loginSchema), loginController)
authRouter.post('/refresh', validateBody(refreshTokenSchema), verifyRefreshToken, refreshTokenController)
authRouter.post('/logout', verifyRefreshToken, logoutController)

export default authRouter
