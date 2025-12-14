// scripts/createAdmin.js
const mongoose = require("mongoose");
const AdminUser = require("../models/AdminUser");
require("dotenv").config();

async function createAdmin() {
  try {
    await mongoose.connect(process.env.MONGO_URI);

    const exists = await AdminUser.findOne({ username: "admin" });
    if (exists) {
      console.log("⚠️ El usuario admin ya existe");
      process.exit(0);
    }

    const admin = new AdminUser({
      username: "admin",
      password: "admin123", // luego la cambias
      role: "superadmin",
      active: true,
    });

    await admin.save();

    console.log("✅ ADMIN CREADO");
    console.log("Usuario: admin");
    console.log("Password: admin123");
    console.log("Rol: superadmin");

    process.exit(0);
  } catch (err) {
    console.error("❌ Error creando admin:", err);
    process.exit(1);
  }
}

createAdmin();
