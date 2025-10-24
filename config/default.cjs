const dotenv = require('dotenv');
const dotenvExpand = require('dotenv-expand');

// Hace accesibles las variables de entorno
const env = dotenv.config();
dotenvExpand.expand(env);

module.exports = {
  port: 3000,
  dbConnectionUri: process.env.DEV_DB_CONNECTION_URI,
  jwtKey: process.env.JWT_KEY,
  allowInsecureConnections: true,
  sendErrorObj: true,
  verbose: 2,
  avoidCors: true,
  logDir: process.env.ROUTE_LOG
};
