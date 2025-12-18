// =============================
// MÓDULO: SEGURIDAD (IPs BLOQUEADAS + SETTINGS)
// =============================

export class SecurityManager {
  constructor(api, ui, auth) {
    this.api = api;
    this.ui = ui;
    this.auth = auth;
  }

  async loadBlockedIPs() {
    try {
      if (!this.auth.roleAtLeast("super")) {
        return this.ui.toast("Solo super puede ver IPs bloqueadas", "error");
      }
      
      const rows = await this.api.getBlockedIPs();
      const tb = document.getElementById("blockedIPsTable");
      if (!tb) return;

      tb.innerHTML = rows.map(r => {
        const estado = r.active ? "Bloqueada" : "Desbloqueada";
        const when = r.updatedAt ? new Date(r.updatedAt).toLocaleString() : "";
        const btn = r.active
          ? `<button class="btn small" onclick="window.securityManager.unblock('${r.ip}')">Desbloquear</button>`
          : `<button class="btn small danger" onclick="window.securityManager.blockQuick('${r.ip}')">Bloquear</button>`;
        
        return `
          <tr>
            <td>${this.ui.escapeHtml(r.ip)}</td>
            <td><span class="badge ${r.active ? "bad" : "ok"}">${estado}</span></td>
            <td>${this.ui.escapeHtml(r.reason || "")}</td>
            <td>${this.ui.escapeHtml(when)}</td>
            <td>${btn}</td>
          </tr>
        `;
      }).join("");
    } catch (e) {
      console.error(e);
      this.ui.toast("Error cargando IPs bloqueadas", "error");
    }
  }

  async block() {
    try {
      if (!this.auth.roleAtLeast("super")) {
        return this.ui.toast("Solo super puede bloquear IPs", "error");
      }
      
      const ip = this.ui.getValue("blockIpValue").trim();
      const reason = this.ui.getValue("blockIpReason").trim();
      
      if (!ip) return this.ui.toast("Escribe una IP", "error");

      await this.api.blockIP({ ip, reason });
      this.ui.toast("IP bloqueada", "success");
      this.ui.clearInput("blockIpValue");
      this.ui.clearInput("blockIpReason");
      this.loadBlockedIPs();
    } catch (e) {
      console.error(e);
      this.ui.toast("Error bloqueando IP", "error");
    }
  }

  async blockQuick(ip) {
    try {
      if (!this.auth.roleAtLeast("super")) return;
      await this.api.blockIP({ ip, reason: "" });
      this.ui.toast("IP bloqueada", "success");
      this.loadBlockedIPs();
    } catch (e) {
      console.error(e);
      this.ui.toast("Error bloqueando IP", "error");
    }
  }

  async unblock(ip) {
    try {
      if (!this.auth.roleAtLeast("super")) {
        return this.ui.toast("Solo super puede desbloquear IPs", "error");
      }
      
      await this.api.unblockIP(ip);
      this.ui.toast("IP desbloqueada", "success");
      this.loadBlockedIPs();
    } catch (e) {
      console.error(e);
      this.ui.toast("Error desbloqueando IP", "error");
    }
  }

  async loadSettings() {
    try {
      if (!this.auth.roleAtLeast("super")) {
        return this.ui.toast("Solo super puede ver settings", "error");
      }
      
      const s = await this.api.getSettings();
      const v = s.ai_daily_limit_per_ip ?? "";
      this.ui.setValue("aiLimitPerIp", v);
      this.ui.toast("Settings cargados", "success");
    } catch (e) {
      console.error(e);
      this.ui.toast("Error cargando settings", "error");
    }
  }

  async saveAiLimit() {
    try {
      if (!this.auth.roleAtLeast("super")) {
        return this.ui.toast("Solo super puede guardar settings", "error");
      }
      
      const v = parseInt(this.ui.getValue("aiLimitPerIp") || "0", 10);
      await this.api.updateAiLimit(v);
      this.ui.toast("Límite IA guardado", "success");
    } catch (e) {
      console.error(e);
      this.ui.toast("Error guardando setting", "error");
    }
  }

  async exportBlockedIPsXLSX() {
    try {
      if (!this.auth.roleAtLeast("super")) {
        return this.ui.toast("Solo super puede exportar", "error");
      }
      await this.api.downloadBlob(`/admin/blocked-ips/export-xlsx`, "ips_bloqueadas.xlsx");
    } catch (e) {
      console.error(e);
      this.ui.toast("Error exportando IPs", "error");
    }
  }

  async exportMetricsLast30Days() {
    try {
      const end = new Date();
      const start = new Date();
      start.setDate(end.getDate() - 30);

      const startStr = start.toISOString().slice(0, 10);
      const endStr = end.toISOString().slice(0, 10);

      await this.api.downloadBlob(
        `/metrics/export-xlsx?start=${encodeURIComponent(startStr)}&end=${encodeURIComponent(endStr)}`,
        "metricas.xlsx"
      );
    } catch (e) {
      console.error(e);
      this.ui.toast("Error exportando métricas", "error");
    }
  }
}