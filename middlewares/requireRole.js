module.exports = function requireRole(roles = []) {
  return (req, res, next) => {
    if (!req.admin) {
      return res.status(401).json({ error: "No autorizado" });
    }

    if (roles.length && !roles.includes(req.admin.role)) {
      return res.status(403).json({ error: "Acceso denegado" });
    }

    next();
  };
};

