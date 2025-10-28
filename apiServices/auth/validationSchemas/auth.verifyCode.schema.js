import Joi from 'joi'

export const verifyCodeSchema = Joi.object({
  email: Joi.string().email().required().messages({
    'string.base': "El campo 'email' debe ser un String.",
    'string.email': "El campo 'email' debe tener un formato válido.",
    'any.required': "El campo 'email' es obligatorio.",
  }),

  code: Joi.number().integer().min(100000).max(999999).required().messages({
    'number.base': "El campo 'code' debe ser un número.",
    'number.min': "El campo 'code' debe tener 6 dígitos.",
    'number.max': "El campo 'code' debe tener 6 dígitos.",
    'any.required': "El campo 'code' es obligatorio.",
  }),
})
