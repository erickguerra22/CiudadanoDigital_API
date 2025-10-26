const validateBody =
  (...schemas) =>
  async (req, res, next) => {
    try {
      await Promise.all(
        schemas.map((schema) => {
          const { error } = schema.validate(req.body, { abortEarly: true })
          if (error) throw error
        })
      )
      return next()
    } catch (err) {
      const messages = err.details?.map((d) => d.message).join(', ') || err.message
      res.status(400).json({ error: messages })
    }
  }

export default validateBody
