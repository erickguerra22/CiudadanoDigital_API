import express from 'express';
import consts from '../utils/consts.js';

const router = express.Router();

const { apiPath } = consts;

router.get(/.*/, (_, res) => {
  res.json({ message: `Bienvenido a la API de CiudadanoDigital. Use ${apiPath} para acceder a los endpoints.` });
});
export default router;
