require("dotenv").config();
const mongoose = require("mongoose");

// Modelo de usuarios admin
const AdminUser = require("../models/AdminUser");

async function createAdmin() {
  await mongoose.connect(process.env.MONGO_URI);

  const exists = await AdminUser.findOne({ username: "admin" });
  if (exists) {
    console.log("⚠️ El admin ya existe");
    process.exit(0);
  }

  await AdminUser.create({
    username: "admin",
    password: "12345",
    role: "super",
    active: true,
  });

  console.log("✅ Admin del PANEL creado");
  process.exit(0);
}

createAdmin();
