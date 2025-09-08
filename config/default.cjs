const dotenv = require('dotenv');

// Hace accesibles las variables de entorno
dotenv.config();

module.exports = {
  port: 3000,
  dbConnectionUri: process.env.DEV_DB_CONNECTION_URI,
  jwtKey: process.env.JWT_KEY,
  allowInsecureConnections: true,
  sendErrorObj: true,
  verbose: 2,
  avoidCors: true,
};
