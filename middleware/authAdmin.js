const jwt = require("jsonwebtoken");

module.exports = function authAdmin(requiredRole = "viewer") {
  return (req, res, next) => {
    try {
      const authHeader = req.headers.authorization;
      if (!authHeader) {
        return res.status(401).json({ error: "No autorizado" });
      }

      const token = authHeader.replace("Bearer ", "");
      const decoded = jwt.verify(token, process.env.ADMIN_JWT_SECRET);

      const roles = ["viewer", "admin", "superadmin"];
      if (roles.indexOf(decoded.role) < roles.indexOf(requiredRole)) {
        return res.status(403).json({ error: "Permisos insuficientes" });
      }

      req.admin = decoded;
      next();
    } catch (err) {
      return res.status(401).json({ error: "Token inválido" });
    }
  };
};
