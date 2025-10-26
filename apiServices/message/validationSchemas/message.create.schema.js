import Joi from 'joi'

export const createMessageSchema = Joi.object({
  content: Joi.string().required().messages({
    'string.base': "El campo 'content' debe ser un String.",
    'any.required': "El campo 'content' es obligatorio.",
  }),
})
