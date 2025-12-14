const jwt = require("jsonwebtoken");

export default function authAdmin(minRole = "viewer") {
  ...
}
{
  return (req, res, next) => {
    const auth = req.headers.authorization;
    if (!auth) {
      return res.status(401).json({ error: "No autorizado" });
    }

    const token = auth.replace("Bearer ", "");

    try {
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
