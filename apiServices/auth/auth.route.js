import express from 'express'
import validateBody from '../../middlewares/validateBody.js'
import { loginSchema } from './validationSchemas/auth.login.schema.js'
import { refreshTokenSchema } from './validationSchemas/auth.refreshToken.schema.js'
import { loginController, refreshTokenController, logoutController } from './auth.controller.js'
import { verifyAccessToken } from '../../middlewares/verifyRefreshToken.middleware.js'

const authRouter = express.Router()

authRouter.post('/login', validateBody(loginSchema), loginController)
authRouter.post('/refresh', validateBody(refreshTokenSchema), verifyAccessToken, refreshTokenController)
authRouter.post('/logout', verifyAccessToken, logoutController)

export default authRouter
