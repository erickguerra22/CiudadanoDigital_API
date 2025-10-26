import Joi from 'joi'

export const loginSchema = Joi.object({
  email: Joi.string().email().required().messages({
    'string.base': "El campo 'email' debe ser un String.",
    'string.email': 'Email inválido',
    'any.required': 'Email es requerido',
  }),
  password: Joi.string().min(6).required().messages({
    'string.base': "El campo 'password' debe ser un String.",
    'string.min': 'Contraseña debe tener al menos 6 caracteres',
    'any.required': 'Contraseña es requerida',
  }),
  deviceId: Joi.string().required().messages({
    'string.base': "El campo 'deviceId' debe ser un String.",
    'any.required': 'deviceId es requerido',
  }),
})
