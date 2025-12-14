import jwt from "jsonwebtoken";

export default function authAdmin(minRole = "viewer") {
  return (req, res, next) => {
    try {
      const auth = req.headers.authorization;
      if (!auth) {
        return res.status(401).json({ error: "NO_TOKEN" });
      }

      const token = auth.split(" ")[1];
      const decoded = jwt.verify(token, process.env.ADMIN_JWT_SECRET);

      const roles = ["viewer", "admin", "superadmin"];
      if (roles.indexOf(decoded.role) < roles.indexOf(minRole)) {
        return res.status(403).json({ error: "NO_PERMISSIONS" });
      }

      req.admin = decoded;
      next();
    } catch (err) {
      return res.status(401).json({ error: "TOKEN_INVALIDO" });
    }
  };
}
