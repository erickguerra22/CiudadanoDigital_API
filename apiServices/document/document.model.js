import { getConnection } from '../../db/connection.js'
import CustomError from '../../utils/customError.js'

export const saveDocumentModel = async ({ userId, category, documentUrl }) => {
  const pool = await getConnection()

  const query = `
    INSERT INTO Documento (userid, category, document_url)
    VALUES ($1, $2, $3)
    RETURNING documentid, userid, category, document_url;
  `

  const values = [userId, category, documentUrl]

  const { rows } = await pool.query(query, values)

  if (!rows || rows.length === 0) throw new CustomError('No se pudo guardar el documento.', 400)

  return rows[0]
}
