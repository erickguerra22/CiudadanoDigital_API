import Joi from 'joi'

export const sendRecoverySchema = Joi.object({
  email: Joi.string().email().required().messages({
    'string.base': "El campo 'email' debe ser un String.",
    'string.email': "El campo 'email' debe tener un formato válido.",
    'any.required': "El campo 'email' es obligatorio.",
  }),
})
