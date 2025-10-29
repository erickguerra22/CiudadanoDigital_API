import { uploadToS3 } from '../../services/s3.service.js'
import { saveDocumentModel } from './document.model.js'
import { exec } from 'child_process'
import { promisify } from 'util'
import { resolve, dirname } from 'path'
import { fileURLToPath } from 'url'
import CustomError from '../../utils/customError.js'
import config from 'config'
import { Logger } from '../../utils/logger.js'

const execAsync = promisify(exec)
const filePath = fileURLToPath(import.meta.url)
const dirPath = dirname(filePath)
const logger = new Logger({ filename: 'document-controller.log' })

export const uploadDocumento = async (req, res) => {
  try {
    const { sub } = req.user
    const { filename: docname, author, year } = req.body
    const file = req.file

    if (!file) throw new CustomError('No se envió ningún archivo', 400)

    const fileName = `owners/${sub}/${Date.now()}-${file.originalname}`
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

    const command = `"${pythonPath}" "${servicePath}" "${localPath}" "${docname}" "${author}" "${year}"`
    const { stdout, stderr } = await execAsync(command)

    if (stderr) {
      logger.error(stderr, { title: 'Error al ejecutar Python' })
      throw new CustomError('No se pudo obtener la respuesta')
    }

    let responseData
    try {
      responseData = JSON.parse(stdout)
    } catch (parseErr) {
      logger.error(parseErr, { title: 'Error al parsear la respuesta de Python' })
      throw new CustomError('Respuesta inválida del servicio Python')
    }

    const { success, category } = responseData

    const document = success
      ? await saveDocumentModel({
          userId: sub,
          category,
          documentUrl: fileName,
        })
      : null
    if (!document) throw new CustomError('El documento no se procesó correctamente')

    if (stderr) logger.error(stderr, { title: 'Error al procesar documento con python' })
    logger.log(stdout, { title: `Salida python al procesar documento ${docname}` })

    return res.status(201).json({
      message: 'Documento subido e indexado correctamente.',
      document,
    })
  } catch (err) {
    logger.error(err.message, { title: 'Error al procesar y guardar documento' })
    if (err instanceof CustomError) {
      return res.status(err.status).json({ error: err.message })
    }
    return res.status(500).json({ error: 'Error interno al subir documento.' })
  }
}
