import express from "express";
import AdminUser from "../models/AdminUser.js";

const router = express.Router();

/**
 * ⚠️ SOLO USAR UNA VEZ
 * URL: /setup/create-admin
 */
router.get("/create-admin", async (req, res) => {
  try {
    const exists = await AdminUser.findOne({ username: "admin" });
    if (exists) {
      return res.json({ ok: false, message: "Admin ya existe" });
    }

    const admin = new AdminUser({
      username: "admin",
      password: "admin123",
      role: "superadmin",
    });

    await admin.save();

    res.json({
      ok: true,
      message: "Admin creado",
      credentials: {
        username: "admin",
        password: "admin123",
      },
    });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "Error creando admin" });
  }
});

export default router;
