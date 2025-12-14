// middleware/authAdmin.js
const jwt = require("jsonwebtoken");

module.exports = function authAdmin(requiredRole = null) {
  return (req, res, next) => {
    const authHeader = req.headers.authorization || "";
    const token = authHeader.startsWith("Bearer ")
      ? authHeader.slice(7)
      : null;

    if (!token) {
      return res.status(401).json({ error: "No autorizado (sin token)" });
    }

    try {
      const decoded = jwt.verify(token, process.env.ADMIN_JWT_SECRET);

      if (requiredRole) {
        const roles = ["viewer", "admin", "superadmin"];
        if (roles.indexOf(decoded.role) < roles.indexOf(requiredRole)) {
          return res.status(403).json({ error: "Permisos insuficientes" });
        }
      }

      req.admin = decoded;
      next();
    } catch (err) {
      return res.status(401).json({ error: "Token inválido" });
    }
  };
};
