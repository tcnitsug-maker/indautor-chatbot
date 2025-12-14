require("dotenv").config();
const mongoose = require("mongoose");
const AdminUser = require("../models/AdminUser");

async function createAdmin() {
  await mongoose.connect(process.env.MONGO_URI);

  const exists = await AdminUser.findOne({ username: "admin" });
  if (exists) {
    console.log("⚠️ El admin ya existe");
    process.exit();
  }

  const admin = await AdminUser.create({
    username: "admin",
    password: "12345",
    role: "superadmin",
    active: true,
  });

  console.log("✅ Admin creado:", admin.username);
  process.exit();
}

createAdmin();

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
