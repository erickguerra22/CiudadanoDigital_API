import Joi from 'joi';

export const refreshTokenSchema = Joi.object({
    refreshToken: Joi.string()
        .uuid()
        .optional()
        .messages({
            'string.guid': 'refreshToken debe ser un UUID válido'
        })
});