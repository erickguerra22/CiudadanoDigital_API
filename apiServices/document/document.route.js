import express from 'express'
import { uploadDocumento } from './document.controller.js'
import validateBody from '../../middlewares/validateBody.js'
import { upload } from '../../middlewares/upload.file.js'
import { saveDocumentSchema } from './validationSchemas/document.save.schema.js'
import { verifyAccessToken } from '../../middlewares/verifyAccessToken.middleware.js'

const documentRouter = express.Router()

documentRouter.post('/', verifyAccessToken, validateBody(saveDocumentSchema), upload.single('file'), uploadDocumento)

export default documentRouter
