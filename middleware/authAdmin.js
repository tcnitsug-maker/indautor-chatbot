c// middleware/authAdmin.js
const jwt = require("jsonwebtoken");

module.exports = function authAdmin(requiredRole = null) {
  return (req, res, next) => {
    const header = req.headers.authorization;

    if (!header || !header.startsWith("Bearer ")) {
      return res.status(401).json({ error: "No autorizado" });
    }

    const token = header.replace("Bearer ", "");

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

