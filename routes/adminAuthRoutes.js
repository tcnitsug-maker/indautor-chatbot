const express = require("express");
const router = express.Router();
const jwt = require("jsonwebtoken");
const AdminUser = require("../models/AdminUser");

router.post("/login", async (req, res) => {
  try {
    const { username, password } = req.body;

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
      token,
      username: user.username,
      role: user.role,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Error en login" });
  }
});

export default router;
