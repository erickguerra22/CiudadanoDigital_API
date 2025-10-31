import { uploadToS3, getPresignedUrl, deleteFromS3 } from '../../services/s3.service.js'
import { saveDocumentModel, getDocumentsModel, getDocumentById, deleteDocumentModel } from './document.model.js'
// import { exec, spawn } from 'child_process'
import { spawn } from 'child_process'
// import { promisify } from 'util'
import { resolve, dirname } from 'path'
import { fileURLToPath } from 'url'
import CustomError from '../../utils/customError.js'
import config from 'config'
import { Logger } from '../../utils/logger.js'
import { sendEmail } from '../../services/email.service.js'

// const execAsync = promisify(exec)
const filePath = fileURLToPath(import.meta.url)
const dirPath = dirname(filePath)
const logger = new Logger({ filename: 'document-controller.log' })

export const uploadDocument = async (req, res) => {
  try {
    const { sub, role, email } = req.user
    const { filename: docname, author, year } = req.body
    const file = req.file

    if (role != 'admin') throw new CustomError('No tienes permiso para subir documentos', 403)
    if (!file) throw new CustomError('No se envió ningún archivo', 400)

    const fileName = `documents/${Date.now()}-${file.originalname}`
    await uploadToS3(file.buffer, fileName, file.mimetype)

    const localPath = resolve(dirPath, `../../tmp/${file.originalname}`)
    import('fs').then(({ writeFileSync, mkdirSync, existsSync }) => {
      const tmpDir = resolve(dirPath, '../../tmp')
      if (!existsSync(tmpDir)) mkdirSync(tmpDir, { recursive: true })
      writeFileSync(localPath, file.buffer)
    })

    const venvPython = config.get('venvPython')
    const pythonPath = resolve(dirPath, `../../ciudadano_digital/${venvPython}`)
    const servicePath = resolve(dirPath, '../../services/processDocumentService/main.py')

    const commandArgs = [servicePath, localPath, docname, author, year, fileName]
    const python = spawn(pythonPath, commandArgs, { stdio: ['ignore', 'pipe', 'pipe'] })

    // Versión en segundo plano:
    let output = ''
    python.stdout.on('data', (data) => {
      output += data.toString()
    })

    python.stderr.on('data', (data) => {
      logger.error(data.toString(), { title: 'Error al procesar el documento' })
    })

    python.on('close', async (code) => {
      try {
        if (code !== 0) throw new Error('Python terminó con error')
        const responseData = JSON.parse(output)
        const { success, category } = responseData

        if (success) {
          await saveDocumentModel({
            userId: sub,
            category,
            documentUrl: fileName,
            title: docname,
            author,
            year,
          })
          await sendEmail({
            to: email,
            subject: 'Tu documento fue procesado correctamente',
            html: `<p>El documento <b>${docname}</b> fue indexado exitosamente en el sistema.</p>`,
          })
        } else {
          await sendEmail({
            to: email,
            subject: 'Error al procesar documento',
            html: `<p>El documento <b>${docname}</b> no pudo procesarse ni subirse al servidor correctamente.</p>`,
          })
        }
      } catch (error) {
        logger.error(error.message, { title: 'Error post-procesamiento Python' })
      }
    })

    return res.status(202).json({
      message: 'Documento recibido. Al terminar el procesamiento, serás notificado mediante el correo electrónico registrado.',
    })

    // Versión síncrona:

    // const command = `"${pythonPath}" "${servicePath}" "${localPath}" "${docname}" "${author}" "${year}" "${fileName}"`
    // const { stdout, stderr } = await execAsync(command)

    // if (stderr) {
    //   logger.error(stderr, { title: 'Error al ejecutar Python' })
    //   throw new CustomError('No se pudo obtener la respuesta')
    // }

    // let responseData
    // try {
    //   responseData = JSON.parse(stdout)
    // } catch (parseErr) {
    //   logger.error(parseErr, { title: 'Error al parsear la respuesta de Python' })
    //   throw new CustomError('Respuesta inválida del servicio Python')
    // }

    // const { success, category } = responseData

    // const document = success
    //   ? await saveDocumentModel({
    //       userId: sub,
    //       category,
    //       documentUrl: fileName,
    //     })
    //   : null
    // if (!document) throw new CustomError('El documento no se procesó correctamente')

    // if (stderr) logger.error(stderr, { title: 'Error al procesar documento con python' })
    // logger.log(stdout, { title: `Salida python al procesar documento ${docname}` })

    // return res.status(201).json({
    //   message: 'Documento subido e indexado correctamente.',
    //   document,
    // })
  } catch (err) {
    logger.error(err.message, { title: 'Error al procesar y guardar documento' })
    if (err instanceof CustomError) {
      return res.status(err.status).json({ error: err.message })
    }
    return res.status(500).json({ error: 'Error interno al subir documento.' })
  }
}

export const getStoredDocuments = async (req, res) => {
  try {
    const { role } = req.user
    const documents = await getDocumentsModel()

    if (role != 'admin') throw new CustomError('No tienes permiso para acceder a este recurso.', 403)

    const documentsWithUrls = await Promise.all(
      documents.map(async (doc) => ({
        ...doc,
        presignedUrl: await getPresignedUrl(doc.document_url),
      }))
    )

    return res.status(200).json({
      message: 'Documentos obtenidos correctamente',
      documents: documentsWithUrls,
    })
  } catch (err) {
    logger.error(err.message, { title: 'Error al obtener documentos' })
    if (err instanceof CustomError) return res.status(err.status).json({ error: err.message })
    return res.status(500).json({ error: 'Error interno del servidor' })
  }
}

export const deleteDocument = async (req, res) => {
  try {
    const { documentId } = req.params
    const { role, email } = req.user

    if (role != 'admin') throw new CustomError('No tienes permiso para acceder a este recurso.', 403)

    const document = await getDocumentById(documentId)
    if (!document) throw new CustomError('Documento no encontrado', 404)

    await deleteFromS3(document.document_url)

    await deleteDocumentModel(documentId)

    const venvPython = config.get('venvPython')
    const pythonPath = resolve(dirPath, `../../ciudadano_digital/${venvPython}`)
    const servicePath = resolve(dirPath, '../../services/processDocumentService/main_delete.py')

    const commandArgs = [servicePath, document.document_url]
    const python = spawn(pythonPath, commandArgs, { stdio: ['ignore', 'pipe', 'pipe'] })

    let output = ''
    python.stdout.on('data', (data) => {
      output += data.toString()
    })

    python.stderr.on('data', (data) => {
      logger.error(data.toString(), { title: 'Error al eliminar documento' })
    })

    python.on('close', async (code) => {
      try {
        if (code !== 0) throw new Error('Python terminó con error al eliminar del documento')
        const responseData = JSON.parse(output)
        const { success, error } = responseData

        if (success) {
          await sendEmail({
            to: email,
            subject: 'Documento eliminado correctamente',
            html: `<p>El documento <b>${document.title}</b> fue removido exitosamente del sistema.</p>`,
          })
        } else {
          logger.error(error, { title: 'Error al eliminar documento del índice' })
          await sendEmail({
            to: email,
            subject: 'Error al eliminar documento',
            html: `<p>El documento <b>${document.title}</b> fue removido solamente de la base de datos. Persiste en el índice.</p>`,
          })
        }
      } catch (error) {
        logger.error(error.message, { title: 'Error post-procesamiento Python al eliminar documento' })
      }
    })

    return res.status(200).json({
      message: 'Solicitud recibida. Al terminar el proceso de eliminación, serás notificado mediante el correo electrónico registrado.',
    })

    // const command = `"${pythonPath}" "${servicePath}" "${document.document_url}"`
    // const { stdout, stderr } = await execAsync(command)

    // if (stderr) {
    //   logger.error(stderr, { title: 'Error al ejecutar Python' })
    //   throw new CustomError('No se pudo obtener la respuesta')
    // }

    // let responseData
    // try {
    //   responseData = JSON.parse(stdout)
    // } catch (parseErr) {
    //   logger.error(parseErr, { title: 'Error al parsear la respuesta de Python' })
    //   throw new CustomError('Respuesta inválida del servicio Python')
    // }

    // const { success, error } = responseData

    // if (!success) throw new CustomError(`No se pudo eliminar el documento del índice: ${error}`)

    // return res.status(200).json({
    //   message: 'Documento eliminado correctamente',
    //   deletedId: documentId,
    // })
  } catch (err) {
    logger.error(err.message, { title: 'Error al eliminar documento' })
    if (err instanceof CustomError) return res.status(err.status).json({ error: err.message })
    return res.status(500).json({ error: 'Error al eliminar documento' })
  }
}
