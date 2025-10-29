import Joi from 'joi'

export const saveDocumentSchema = Joi.object({
  filename: Joi.string().required().messages({
    'string.base': "El campo 'filename' debe ser un texto.",
    'any.required': "El campo 'filename' es obligatorio.",
  }),
  author: Joi.string().required().messages({
    'string.base': "El campo 'author' debe ser un texto.",
    'any.required': "El campo 'author' es obligatorio.",
  }),
  year: Joi.number().integer().required().messages({
    'number.base': "El campo 'year' debe ser un número.",
    'number.integer': "El campo 'year' debe ser un número entero.",
    'any.required': "El campo 'year' es obligatorio.",
  }),
  file: Joi.object()
    .required()
    .messages({
      'object.base': 'El archivo es obligatorio.',
      'any.required': "El campo 'file' es obligatorio.",
    })
    .unknown(),
})
