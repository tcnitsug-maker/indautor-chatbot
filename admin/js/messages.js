// =============================
// MÓDULO: HISTORIAL DE MENSAJES
// =============================

export class MessagesManager {
  constructor(api, ui) {
    this.api = api;
    this.ui = ui;
  }

  async loadGeneralHistory() {
    try {
      const msgs = await this.api.getMessages();
      const tbody = document.getElementById("generalHistory");
      tbody.innerHTML = "";

      msgs.forEach(m => {
        this.renderMessageRow(tbody, m);
      });
    } catch (err) {
      console.error(err);
      this.ui.toast("Error cargando historial general", "error");
    }
  }

  renderMessageRow(tbody, m) {
    const tr = document.createElement("tr");

    const tdRole = document.createElement("td");
    tdRole.textContent = m.role;

    const tdText = document.createElement("td");
    tdText.innerHTML = `<div class="small">${this.ui.escapeHtml(m.text)}</div>`;

    const tdDate = document.createElement("td");
    tdDate.textContent = this.ui.formatDate(m.createdAt);

    tr.appendChild(tdRole);
    tr.appendChild(tdText);
    tr.appendChild(tdDate);

    tbody.appendChild(tr);
  }

  prependMessage(msg) {
    const tbody = document.getElementById("generalHistory");
    if (!tbody) return;

    const tr = document.createElement("tr");

    const tdRole = document.createElement("td");
    tdRole.textContent = msg.role;

    const tdText = document.createElement("td");
    tdText.innerHTML = `<div class="small">${this.ui.escapeHtml(msg.text)}</div>`;

    const tdDate = document.createElement("td");
    tdDate.textContent = this.ui.formatDate(msg.createdAt);

    tr.appendChild(tdRole);
    tr.appendChild(tdText);
    tr.appendChild(tdDate);

    tbody.prepend(tr);
  }
}