// routes/adminAuthRoutes.js
const express = require("express");
const router = express.Router();
const jwt = require("jsonwebtoken");
const AdminUser = require("../models/AdminUser");

// ===============================
// POST /admin-auth/login
// ===============================
router.post("/login", async (req, res) => {
  try {
    const { username, password } = req.body;

    if (!username || !password) {
      return res.status(400).json({ error: "Faltan credenciales" });
    }

    const user = await AdminUser.findOne({ username, active: true });
    if (!user) {
      return res.status(401).json({ error: "Credenciales inválidas" });
    }

    const ok = await user.comparePassword(password);
    if (!ok) {
      return res.status(401).json({ error: "Credenciales inválidas" });
    }

    const token = jwt.sign(
      {
        id: user._id,
        username: user.username,
        role: user.role,
      },
      process.env.ADMIN_JWT_SECRET,
      { expiresIn: "8h" }
    );

    res.json({
      ok: true,
      token,
      role: user.role,
      username: user.username,
    });
  } catch (err) {
    console.error("Error en login admin:", err);
    res.status(500).json({ error: "Error interno del servidor" });
  }
});

module.exports = router;
