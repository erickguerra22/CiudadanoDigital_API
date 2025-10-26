import Joi from 'joi'

export const verifyCodeSchema = Joi.object({
  email: Joi.string().email().required().messages({
    'string.base': "El campo 'email' debe ser un String.",
    'string.email': "El campo 'email' debe tener un formato válido.",
    'any.required': "El campo 'email' es obligatorio.",
  }),

  code: Joi.string()
    .pattern(/^\d{6}$/)
    .required()
    .messages({
      'string.base': "El campo 'code' debe ser un String.",
      'string.pattern.base': "El campo 'code' debe ser un número de 6 dígitos.",
      'any.required': "El campo 'code' es obligatorio.",
    }),
})
