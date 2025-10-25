import Joi from 'joi'

export const updateUserSchema = Joi.object({
  phoneNumber: Joi.string()
    .pattern(/^[0-9]+$/)
    .messages({
      'string.pattern.base': "El campo 'phoneNumber' debe contener solo números.",
    }),

  phoneCode: Joi.string()
    .pattern(/^\+[0-9]{1,3}$/)
    .messages({
      'string.pattern.base': "El campo 'phoneCode' debe tener un formato válido, por ejemplo, +502.",
    }),

  birthdate: Joi.date().allow(null).messages({
    'date.base': "El campo 'birthdate' debe ser una fecha válida.",
  }),

  lastnames: Joi.string().messages(),

  names: Joi.string().messages(),

  email: Joi.string().email().messages({
    'string.email': "El campo 'email' debe tener un formato válido.",
  }),
})
  .unknown(false)
  .messages({
    'object.unknown': 'Existen campos no permitidos en el cuerpo de la solicitud.',
  })
