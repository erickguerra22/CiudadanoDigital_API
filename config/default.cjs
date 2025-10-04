const dotenv = require('dotenv');

dotenv.config();

module.exports = {
  port: 3000,
  connection_uri: process.env.DEV_DB_CONNECTION_URI,
  jwtKey: process.env.JWT_KEY,
  allowInsecureConnections: true,
  sendErrorObj: true,
  verbose: 2,
  avoidCors: true,
};
