// =============================
// MÓDULO: GESTOR DE PESTAÑAS
// =============================

export class TabManager {
  constructor(ui) {
    this.ui = ui;
    this.loadFunctions = {};
  }

  registerTab(tabId, loadFunction) {
    this.loadFunctions[tabId] = loadFunction;
  }

  setActiveTab(tabId) {
    document.querySelectorAll(".tab-content").forEach(sec => {
      sec.classList.toggle("active", sec.id === tabId);
    });

    document.querySelectorAll("#navbar button").forEach(btn => {
      btn.classList.toggle("active", btn.getAttribute("data-tab") === tabId);
    });

    if (this.loadFunctions[tabId]) {
      this.loadFunctions[tabId]();
    }
  }

  init() {
    document.querySelectorAll("#navbar button").forEach(btn => {
      btn.addEventListener("click", () => {
        this.setActiveTab(btn.getAttribute("data-tab"));
      });
    });
  }
}