import Joi from 'joi'

export const createChatSchema = Joi.object({
  name: Joi.string().required().messages({
    'string.base': "El campo 'name' debe ser un String.",
    'any.required': "El campo 'name' es obligatorio.",
  }),
})
