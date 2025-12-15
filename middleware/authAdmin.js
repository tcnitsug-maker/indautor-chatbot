const jwt = require("jsonwebtoken");

const ROLE_ORDER = ["support","viewer","analyst","admin","editor","superadmin","super"];

function normalizeRole(role) {
  if (!role) return "support";
  const r = String(role).toLowerCase();
  if (r === "viewer") return "analyst";
  if (r === "admin") return "editor";
  if (r === "superadmin") return "super";
  if (ROLE_ORDER.includes(r)) return r;
  return "support";
}

function hasRoleAtLeast(userRole, requiredRole) {
  const u = normalizeRole(userRole);
  const req = normalizeRole(requiredRole);
  return ROLE_ORDER.indexOf(u) >= ROLE_ORDER.indexOf(req);
}

module.exports = function authAdmin(requiredRole = "analyst") {
  return (req, res, next) => {
    const auth = req.headers.authorization;
    if (!auth) return res.status(401).json({ error: "No autorizado" });

    const token = auth.replace("Bearer ", "");

    try {
      const decoded = jwt.verify(token, process.env.ADMIN_JWT_SECRET);
      decoded.role = normalizeRole(decoded.role);

      if (!hasRoleAtLeast(decoded.role, requiredRole)) {
        return res.status(403).json({ error: "Permisos insuficientes" });
      }

      req.admin = decoded;
      next();
    } catch {
      return res.status(401).json({ error: "Token inválido" });
    }
  };
};

module.exports.normalizeRole = normalizeRole;
module.exports.hasRoleAtLeast = hasRoleAtLeast;
