import Joi from 'joi';

export const loginSchema = Joi.object({
  email: Joi.string()
    .email()
    .required()
    .messages({
      'string.email': 'Email inválido',
      'any.required': 'Email es requerido'
    }),
  password: Joi.string()
    .min(8)
    .required()
    .messages({
      'string.min': 'Contraseña debe tener al menos 8 caracteres',
      'any.required': 'Contraseña es requerida'
    }),
  deviceId: Joi.string()
    .uuid()
    .required()
    .messages({
      'string.guid': 'deviceId debe ser un UUID válido',
      'any.required': 'deviceId es requerido'
    })
});

export const refreshSchema = Joi.object({
  refreshToken: Joi.string()
    .uuid()
    .optional()
    .messages({
      'string.guid': 'refreshToken debe ser un UUID válido'
    })
});