import Joi from 'joi'

export const createUserSchema = Joi.object({
  deviceId: Joi.string().required().messages({
    'any.required': "El campo 'deviceId' es obligatorio.",
  }),

  password: Joi.string().min(6).required().messages({
    'string.min': "El campo 'password' debe tener al menos 6 caracteres.",
    'any.required': "El campo 'password' es obligatorio.",
  }),

  phoneNumber: Joi.string()
    .pattern(/^[0-9]+$/)
    .required()
    .messages({
      'string.pattern.base': "El campo 'phoneNumber' debe contener solo números.",
      'any.required': "El campo 'phoneNumber' es obligatorio.",
    }),

  phoneCode: Joi.string()
    .pattern(/^\+[0-9]{1,3}$/)
    .required()
    .messages({
      'string.pattern.base': "El campo 'phoneCode' debe tener un formato válido, por ejemplo, +502.",
      'any.required': "El campo 'phoneCode' es obligatorio.",
    }),

  birthdate: Joi.date().allow(null).messages({
    'date.base': "El campo 'birthdate' debe ser una fecha válida.",
  }),

  lastnames: Joi.string().required().messages({
    'any.required': "El campo 'lastnames' es obligatorio.",
  }),

  names: Joi.string().required().messages({
    'any.required': "El campo 'names' es obligatorio.",
  }),

  email: Joi.string().email().required().messages({
    'string.email': "El campo 'email' debe tener un formato válido.",
    'any.required': "El campo 'email' es obligatorio.",
  }),
})
  .unknown(false)
  .messages({
    'object.unknown': 'Existen campos no permitidos en el cuerpo de la solicitud.',
  })
