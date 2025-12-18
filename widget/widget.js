const mongoose = require("mongoose");
const AdminUser = require("../models/AdminUser");
require("dotenv").config();

async function run() {
  await mongoose.connect(process.env.MONGO_URI);

  const username = "admin";
  const newPassword = "123456"; // 👈 cambia si quieres

  let user = await AdminUser.findOne({ username });

  if (!user) {
    user = await AdminUser.create({
      username,
      password: newPassword,
      role: "super",
      active: true,
    });
    console.log("✅ Usuario admin CREADO");
  } else {
    user.password = newPassword;
    user.active = true;
    user.role = "super";
    await user.save();
    console.log("✅ Contraseña de admin ACTUALIZADA");
  }

  process.exit();
}

run();
