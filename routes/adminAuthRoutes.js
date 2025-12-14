import express from "express";
import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";
import AdminUser from "../models/AdminUser.js";

const router = express.Router();

// =====================
// LOGIN ADMIN
// POST /admin-auth/login
// =====================
router.post("/login", async (req, res) => {
  try {
    const { username, password } = req.body;

    if (!username || !password) {
      return res.status(400).json({ error: "Faltan datos" });
    }

    const admin = await AdminUser.findOne({ username });
    if (!admin) {
      return res.status(401).json({ error: "Usuario no existe" });
    }

    if (!admin.active) {
      return res.status(403).json({ error: "Usuario desactivado" });
    }

    const ok = await bcrypt.compare(password, admin.password);
    if (!ok) {
      return res.status(401).json({ error: "Contraseña incorrecta" });
    }

    const token = jwt.sign(
      {
        id: admin._id,
        username: admin.username,
        role: admin.role,
      },
      process.env.ADMIN_JWT_SECRET,
      { expiresIn: "8h" }
    );

    res.json({ ok: true, token });
  } catch (err) {
    console.error("Login admin error:", err);
    res.status(500).json({ error: "Error en login" });
  }
});

export default router;
