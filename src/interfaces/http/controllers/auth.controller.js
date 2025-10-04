import { AuthService } from "../../../application/services/auth.service.js";
import CustomError from "../../../shared/custom.error.js";

const authService = new AuthService();

export class AuthController {
  static async login(req, res) {
    try {
      const { email, password, deviceId } = req.body;
      const clientType = req.headers['x-client-type'] || 'web'; // 'web' o 'mobile'

      const result = await authService.login(email, password, deviceId);

      // Estrategia dual: cookies para web, body para móvil
      if (clientType === 'web') {
        // Web: Usar httpOnly cookie (más seguro contra XSS)
        res.cookie('refreshToken', result.refreshToken, {
          httpOnly: true,
          secure: process.env.NODE_ENV === 'production',
          sameSite: 'strict',
          maxAge: result.refreshExpiresAt * 1000 - Date.now()
        });

        const { refreshToken, ...responseData } = result;
        res.json(responseData);
      } else {
        // Móvil: Enviar refreshToken en el body
        res.json(result);
      }
    } catch (err) {
      if (err instanceof CustomError) {
        return res.status(err.status).json({ error: err.message });
      }
      console.error('Login error:', err);
      res.status(500).json({ error: "Error interno del servidor" });
    }
  }

  static async refreshToken(req, res) {
    try {
      const { userId, deviceId } = req.verifiedToken;
      const refreshToken = req.cookies.refreshToken || req.body.refreshToken;

      if (!refreshToken) {
        throw new CustomError("Refresh token no proporcionado", 401);
      }

      const result = await authService.refreshAccessToken(userId, deviceId, refreshToken);

      res.json(result);
    } catch (err) {
      if (err instanceof CustomError) {
        return res.status(err.status).json({ error: err.message });
      }
      console.error('Refresh token error:', err);
      res.status(500).json({ error: "Error interno del servidor" });
    }
  }

  static async logout(req, res) {
    try {
      const { userId, deviceId } = req.verifiedToken;
      const refreshToken = req.cookies.refreshToken || req.body.refreshToken;

      await authService.logout(userId, deviceId, refreshToken);

      // Limpiar cookie
      res.clearCookie('refreshToken');

      res.json({ message: "Sesión cerrada exitosamente" });
    } catch (err) {
      if (err instanceof CustomError) {
        return res.status(err.status).json({ error: err.message });
      }
      console.error('Logout error:', err);
      res.status(500).json({ error: "Error interno del servidor" });
    }
  }
}