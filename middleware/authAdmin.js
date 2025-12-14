const jwt = require("jsonwebtoken");

// Roles nuevos (de menor a mayor):
// support < analyst < editor < super
//
// Roles legacy (compatibilidad con instalaciones viejas):
// viewer -> analyst
// admin -> editor
// superadmin -> super
const ROLE_ORDER = ["support", "analyst", "editor", "super"];

function normalizeRole(role) {
  if (!role) return "support";
  const r = String(role).toLowerCase();
  if (r === "viewer") return "analyst";
  if (r === "admin") return "editor";
  if (r === "superadmin") return "super";
  if (ROLE_ORDER.includes(r)) return r;
  // Si llega algo raro, por seguridad lo bajamos al mínimo
  return "support";
}

function hasRequiredRole(userRole, requiredRole) {
  const u = ROLE_ORDER.indexOf(normalizeRole(userRole));
  const req = ROLE_ORDER.indexOf(normalizeRole(requiredRole));
  return u >= req;
}

module.exports = function authAdmin(requiredRole = "support") {
  return (req, res, next) => {
    const auth = req.headers.authorization;
    if (!auth) return res.status(401).json({ error: "No autorizado" });

    const token = auth.replace("Bearer ", "");

    try {
      const decoded = jwt.verify(token, process.env.ADMIN_JWT_SECRET);

      const userRole = normalizeRole(decoded.role);
      const required = normalizeRole(requiredRole);

      if (!hasRequiredRole(userRole, required)) {
        return res.status(403).json({ error: "Permisos insuficientes" });
      }

      // Enriquecemos el objeto para el resto de rutas
      req.admin = {
        ...decoded,
        role: userRole,
        roleLegacy: decoded.role,
      };
      next();
    } catch (err) {
      return res.status(401).json({ error: "Token inválido" });
    }
  };
};

module.exports.normalizeRole = normalizeRole;
module.exports.ROLE_ORDER = ROLE_ORDER;
