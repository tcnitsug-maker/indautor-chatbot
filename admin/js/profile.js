// =============================
// MÓDULO: PERFIL DE USUARIO
// =============================

export class ProfileManager {
  constructor(api, ui) {
    this.api = api;
    this.ui = ui;
  }

  async load() {
    const box = document.getElementById("profileBox");
    if (!box) return;
    
    try {
      const u = await this.api.getProfile();
      box.innerHTML = `
        <div><b>Usuario:</b> ${this.ui.escapeHtml(u.username)}</div>
        <div><b>Rol:</b> ${this.ui.escapeHtml(String(u.role || ""))}</div>
        <div><b>Activo:</b> ${u.active ? "Sí" : "No"}</div>
        <div><b>Creado:</b> ${this.ui.formatDate(u.createdAt)}</div>
        <div><b>Actualizado:</b> ${this.ui.formatDate(u.updatedAt)}</div>
      `;
    } catch (e) {
      console.error(e);
      box.textContent = "No se pudo cargar el perfil";
    }
  }

  async changePassword() {
    try {
      const currentPassword = this.ui.getValue("myCurrentPassword");
      const newPassword = this.ui.getValue("myNewPassword");
      
      if (!currentPassword || !newPassword) {
        return this.ui.toast("Faltan datos", "error");
      }
      
      await this.api.updateMyPassword({ currentPassword, newPassword });
      this.ui.toast("Contraseña cambiada", "success");
      this.ui.clearInput("myCurrentPassword");
      this.ui.clearInput("myNewPassword");
    } catch (e) {
      console.error(e);
      this.ui.toast(e.message || "No se pudo cambiar", "error");
    }
  }
}