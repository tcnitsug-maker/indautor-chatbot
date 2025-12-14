const AdminUser = require("../models/AdminUser");
const bcrypt = require("bcryptjs");

exports.changePassword = async (req, res) => {
  try {
    const adminId = req.admin.id;
    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
      return res.status(400).json({ error: "Faltan datos" });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({ error: "La nueva contraseña es muy corta" });
    }

    const user = await AdminUser.findById(adminId);
    if (!user) {
      return res.status(404).json({ error: "Usuario no encontrado" });
    }

    const ok = await bcrypt.compare(currentPassword, user.password);
    if (!ok) {
      return res.status(401).json({ error: "Contraseña actual incorrecta" });
    }

    user.password = newPassword; // se hashea solo (pre-save)
    await user.save();

    res.json({ ok: true, message: "Contraseña actualizada correctamente" });
  } catch (err) {
    console.error("changePassword:", err);
    res.status(500).json({ error: "Error al cambiar contraseña" });
  }
};
