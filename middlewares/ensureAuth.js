import { validateToken } from '../services/jwt.js';
import consts from '../utils/consts.js';

const ensureAuth = async (req, res, next) => {
  try {
    const authHeader = req.headers['authorization'];
    if (!authHeader) {
      res.statusMessage = 'El usuario no está autenticado.';
      return res.sendStatus(401);
    }

    const tokenParts = authHeader.split(' ');
    if (tokenParts.length !== 2 || tokenParts[0] !== 'Bearer') {
      res.statusMessage = 'Formato de token inválido.';
      return res.sendStatus(401);
    }

    const accessToken = tokenParts[1];

    // Validar JWT
    const userData = await validateToken(accessToken);

    // Verificar que sea un access token
    if (userData.type !== consts.token.access) {
      res.statusMessage = 'El token proporcionado no es un access token válido.';
      return res.sendStatus(401);
    }

    // Guardar datos del usuario para usar en controllers
    console.log("USERDATA: ", userData);
    req.session = {
      userId: userData.userId,
      deviceId: userData.deviceId,
      email: userData.email,
      names: userData.names,
      lastnames: userData.lastnames,
    };

    next();
  } catch (ex) {
    res.statusMessage = 'El token de acceso no es válido o ha expirado.';
    return res.sendStatus(401);
  }
};

export default ensureAuth;
