require("dotenv").config();
const mongoose = require("mongoose");
const AdminUser = require("../models/AdminUser");

(async () => {
  await mongoose.connect(process.env.MONGO_URI);

  const admin = await AdminUser.create({
    username: "admin",
    password: "123456",
    role: "superadmin",
  });

  console.log("✅ Admin creado:", admin.username);
  process.exit();
})();
