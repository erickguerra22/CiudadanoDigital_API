import { verifyToken } from "./jwt.js";

export function roleMiddleware(allowedRoles = []) {
  return (req, res, next) => {
    try {
      const token = req.headers["authorization"]?.split(" ")[1];
      if (!token) return res.status(401).json({ error: "Token requerido" });

      const decoded = verifyToken(token);

      if (!allowedRoles.includes(decoded.role) && !allowedRoles.some(r => decoded.role.includes(r))) {
        return res.status(403).json({ error: "Acceso denegado" });
      }

      req.user = decoded;
      next();
    } catch (err) {
      return res.status(401).json({ error: "Token inválido" });
    }
  };
}
