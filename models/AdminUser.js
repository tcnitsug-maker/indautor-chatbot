const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");

const AdminUserSchema = new mongoose.Schema(
  {
    username: { type: String, unique: true, required: true },
    password: { type: String, required: true },
    role: {
      type: String,
      // Roles nuevos (recomendados): support, analyst, editor, super
      // Roles legacy (compatibilidad): viewer, admin, superadmin
      enum: [
        "support",
        "analyst",
        "editor",
        "super",
        "viewer",
        "admin",
        "superadmin",
      ],
      default: "support",
    },
    active: { type: Boolean, default: true },
  },
  { timestamps: true }
);

AdminUserSchema.pre("save", async function () {
  if (!this.isModified("password")) return;
  this.password = await bcrypt.hash(this.password, 10);
});

AdminUserSchema.methods.comparePassword = function (plain) {
  return bcrypt.compare(plain, this.password);
};

module.exports = mongoose.model("AdminUser", AdminUserSchema);
