// scripts/createAdmin.js
require("dotenv").config();
const mongoose = require("mongoose");
const AdminUser = require("../models/AdminUser");

async function createAdmin() {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log("✅ Conectado a MongoDB");

    const username = "admin";
    const password = "admin123"; // ← puedes cambiarlo
    const role = "superadmin";

    const exists = await AdminUser.findOne({ username });
    if (exists) {
      console.log("⚠️ El usuario admin ya existe");
      process.exit(0);
    }

    await AdminUser.create({
      username,
      password,
      role,
    });

    console.log("🎉 ADMIN CREADO CON ÉXITO");
    console.log("Usuario:", username);
    console.log("Password:", password);
    console.log("Rol:", role);

    process.exit(0);
  } catch (err) {
    console.error("❌ Error creando admin:", err);
    process.exit(1);
  }
}

createAdmin();
