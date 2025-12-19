
export function requireRole(roles = []) {
  return (req, res, next) => {
    if (!req.admin || !roles.includes(req.admin.role)) {
      return res.status(403).json({ error: "Acceso denegado" });
    }
    next();
  };
}
