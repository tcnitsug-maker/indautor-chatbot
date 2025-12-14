const express = require("express");
const router = express.Router();
const jwt = require("jsonwebtoken");
const AdminUser = require("../models/AdminUser");

// ================================
// POST /admin-auth/login
// ================================
router.post("/login", async (req, res) => {
  try {
    const { username, password } = req.body;

    if (!username || !password) {
      return res.status(400).json({
        error: "Usuario y contraseña requeridos",
      });
    }

    const user = await AdminUser.findOne({
      username,
      active: true,
    });

    if (!user) {
      return res.status(401).json({
        error: "Credenciales inválidas",
      });
    }

    const valid = await user.comparePassword(password);
    if (!valid) {
      return res.status(401).json({
        error: "Credenciales inválidas",
      });
    }

    if (!process.env.ADMIN_JWT_SECRET) {
      return res.status(500).json({
        error: "ADMIN_JWT_SECRET no configurado",
      });
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
      user: {
        id: user._id,
        username: user.username,
        role: user.role,
      },
    });
  } catch (err) {
    console.error("Error en login admin:", err);
    res.status(500).json({
      error: "Error interno al iniciar sesión",
    });
  }
});

module.exports = router;
