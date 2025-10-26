import nodemailer from 'nodemailer'
import CustomError from '../utils/customError.js'
import { Logger } from '../utils/logger.js'
import config from 'config'

const logger = new Logger({ filename: 'email-service.log' })

const transporter = nodemailer.createTransport({
  // host: config.get('smtpHost'),
  // port: config.get('smtpPort') || 587,
  // secure: false,
  service: 'gmail',
  auth: {
    user: config.get('smtpUser'),
    pass: config.get('smtpPass'),
  },
  // tls: {
  //   ciphers: 'SSLv3',
  // },
})

/**
 * Envía un correo electrónico
 * @param {Object} options
 * @param {string} options.to - Destinatario
 * @param {string} options.subject - Asunto del correo
 * @param {string} options.text - Texto plano (opcional)
 * @param {string} options.html - Contenido HTML (opcional)
 */
export const sendEmail = async ({ to, subject, text, html }) => {
  try {
    if (!to || (!text && !html)) {
      throw new CustomError('Faltan parámetros para enviar el correo', 400)
    }

    const info = await transporter.sendMail({
      from: `"Ciudadano Digital" <${config.get('smtpUser')}>`,
      to,
      subject,
      text,
      html,
    })

    logger.log('Correo enviado: %s', info.messageId)
    return info
  } catch (err) {
    logger.error(err.message, { title: 'Error al enviar correo' })
    throw new CustomError('No se pudo enviar el correo electrónico', 500)
  }
}
