import express from 'express'
import validateBody from '../../middlewares/validateBody.js'
import { loginSchema } from './validationSchemas/auth.login.schema.js'
import { refreshTokenSchema } from './validationSchemas/auth.refreshToken.schema.js'
import { verifyCodeSchema } from './validationSchemas/auth.verifyCode.schema.js'
import { resetPasswordSchema } from './validationSchemas/auth.resetPassword.schema.js'
import { sendRecoverySchema } from './validationSchemas/auth.sendRecovery.schema.js'
import { loginController, refreshTokenController, logoutController, requestRecoveryCode, verifyRecoveryCode, recoverPassword } from './auth.controller.js'
import { verifyAccessToken } from '../../middlewares/verifyAccessToken.middleware.js'
import { verifyRecoveryToken } from '../../middlewares/verifyRecoveryToken.middleware.js'
import { verifyRefreshAccess } from '../../middlewares/verifyRefreshAccess.middleware.js'

const authRouter = express.Router()

authRouter.post('/login', validateBody(loginSchema), loginController)
authRouter.post('/refresh', verifyRefreshAccess, validateBody(refreshTokenSchema), refreshTokenController)
authRouter.post('/logout', verifyAccessToken, logoutController)
authRouter.post('/sendRecovery', validateBody(sendRecoverySchema), requestRecoveryCode)
authRouter.post('/verifyCode', validateBody(verifyCodeSchema), verifyRecoveryCode)
authRouter.post('/recoverPassword', verifyRecoveryToken, validateBody(resetPasswordSchema), recoverPassword)

export default authRouter
