import mongoose from "mongoose";
import AdminUser from "../models/AdminUser.js";
import dotenv from "dotenv";

dotenv.config();

async function run() {
  await mongoose.connect(process.env.MONGODB_URI);

  const user = await AdminUser.findOne({ username: "admin" });
  if (!user) {
    console.log("❌ Usuario admin no encontrado");
    process.exit(1);
  }

  user.role = "super";
  user.active = true;
  await user.save();

  console.log("✅ Usuario 'admin' ahora es SUPER");
  process.exit(0);
}

run();
