import { getConnection } from '../../db/connection.js'
import CustomError from '../../utils/customError.js'

export const saveDocumentModel = async ({ userId, category, documentUrl, title, author, year }) => {
  const pool = await getConnection()

  const query = `
    INSERT INTO Documento (userid, category, document_url, title, author, year)
    VALUES ($1, $2, $3, $4, $5, $6)
    RETURNING documentid, userid, category, document_url, title, author, year;
  `

  const values = [userId, category, documentUrl, title, author, year]

  const { rows } = await pool.query(query, values)

  if (!rows || rows.length === 0) throw new CustomError('No se pudo guardar el documento.', 400)

  return rows[0]
}

export const getDocumentsModel = async () => {
  const pool = await getConnection()

  const query = `
    SELECT 
      documentid, 
      userid, 
      category, 
      document_url,
      title,
      author,
      year
    FROM Documento;
  `

  const { rows } = await pool.query(query)

  if (!rows || rows.length === 0) throw new CustomError('No se encontraron documentos.', 404)

  return rows
}

export const getDocumentById = async (documentId) => {
  const pool = await getConnection()

  const query = `
    SELECT 
      documentid, 
      userid, 
      category, 
      document_url,
      title,
      author,
      year
    FROM Documento
    WHERE documentid = $1;
  `

  const values = [documentId]

  const { rows } = await pool.query(query, values)

  if (!rows || rows.length === 0) throw new CustomError('Documento no encontrado.', 404)

  return rows[0]
}

export const deleteDocumentModel = async (documentId) => {
  const pool = await getConnection()

  const query = `
    DELETE FROM Documento
    WHERE documentid = $1;
  `

  const values = [documentId]

  await pool.query(query, values)
}
