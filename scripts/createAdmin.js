require("dotenv").config();
const mongoose = require("mongoose");

// ✅ RUTA REAL (DOBLE utneza-chatbot)
const AdminUser = require("../utneza-chatbot/models/AdminUser.js");

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
    role: "superadmin",
    active: true,
  });

  console.log("✅ Admin del PANEL creado");
  process.exit(0);
}

createAdmin();
