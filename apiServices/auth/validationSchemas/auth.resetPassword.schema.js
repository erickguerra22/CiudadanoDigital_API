import Joi from 'joi'

export const resetPasswordSchema = Joi.object({
  password: Joi.string().min(8).required().messages({
    'string.base': "El campo 'password' debe ser un String.",
    'string.min': 'Contraseña debe tener al menos 8 caracteres',
    'any.required': 'Contraseña es requerida',
  }),
})
