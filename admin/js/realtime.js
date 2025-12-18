// =============================
// MÓDULO: SOCKET.IO REALTIME
// =============================

export class RealtimeManager {
  constructor(auth, ui, dashboardManager, messagesManager) {
    this.auth = auth;
    this.ui = ui;
    this.dashboardManager = dashboardManager;
    this.messagesManager = messagesManager;
    this.socket = null;
  }

  init() {
    if (typeof io === "undefined") {
      console.warn("socket.io client no está cargado");
      return;
    }

    this.socket = io({
      auth: { token: this.auth.getToken() },
    });

    this.socket.on("connect", () => {
      this.ui.toast("Tiempo real conectado", "success");
    });

    this.socket.on("connect_error", (err) => {
      console.error("Socket error:", err);
      this.ui.toast("Tiempo real no autorizado / token inválido", "error");
    });

    this.socket.on("new_message", (msg) => {
      this.handleNewMessage(msg);
    });

    this.socket.on("spam_alert", (data) => {
      this.ui.toast(`SPAM/FLOOD detectado de IP ${data.ip} (bloqueo temporal)`, "error");
    });
  }

  handleNewMessage(msg) {
    if (msg?.role === "user") {
      this.ui.toast(
        `Nuevo mensaje (${msg.ip || "IP?"}): ${String(msg.text || "").slice(0, 80)}...`,
        "info"
      );
    }

    const active = document.querySelector(".tab-content.active")?.id;

    if (active === "messages") {
      this.messagesManager.prependMessage(msg);
    }

    if (active === "dashboard") {
      this.dashboardManager.updateMessageCount();
    }
  }

  disconnect() {
    if (this.socket) {
      this.socket.disconnect();
    }
  }
}