import express from 'express'
import { deleteDocument, getStoredDocuments, uploadDocument } from './document.controller.js'
import validateBody from '../../middlewares/validateBody.js'
import { upload } from '../../middlewares/upload.file.js'
import { saveDocumentSchema } from './validationSchemas/document.save.schema.js'
import { verifyAccessToken } from '../../middlewares/verifyAccessToken.middleware.js'

const documentRouter = express.Router()

documentRouter.post('/', verifyAccessToken, validateBody(saveDocumentSchema), upload.single('file'), uploadDocument)
documentRouter.get('/', verifyAccessToken, getStoredDocuments)
documentRouter.delete('/:documentId', verifyAccessToken, deleteDocument)

export default documentRouter
