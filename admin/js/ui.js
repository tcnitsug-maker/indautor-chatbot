// =============================
// MÓDULO: UI UTILITIES
// =============================

export class UIManager {
  constructor() {
    this.ensureToastRoot();
  }

  formatDate(iso) {
    if (!iso) return "";
    return new Date(iso).toLocaleString();
  }

  escapeHtml(text) {
    return String(text || "")
      .replace(/&/g, "&amp;")
      .replace(/`/g, "&#96;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  ensureToastRoot() {
    if (document.getElementById("toastRoot")) return;
    const div = document.createElement("div");
    div.id = "toastRoot";
    div.style.position = "fixed";
    div.style.right = "16px";
    div.style.bottom = "16px";
    div.style.zIndex = 99999;
    div.style.display = "flex";
    div.style.flexDirection = "column";
    div.style.gap = "10px";
    document.body.appendChild(div);
  }

  toast(msg, type = "info") {
    this.ensureToastRoot();
    const root = document.getElementById("toastRoot");
    const t = document.createElement("div");
    t.style.background =
      type === "error" ? "#ffdddd" :
      type === "success" ? "#ddffdd" :
      "#ffffff";
    t.style.border = "1px solid #ccc";
    t.style.borderRadius = "10px";
    t.style.padding = "10px 12px";
    t.style.boxShadow = "0 2px 10px rgba(0,0,0,.2)";
    t.style.maxWidth = "320px";
    t.innerHTML = `
      <div style="font-weight:700;margin-bottom:4px;">
        ${type.toUpperCase()}
      </div>
      <div style="font-size:14px;">
        ${this.escapeHtml(msg)}
      </div>`;
    root.appendChild(t);
    setTimeout(() => t.remove(), 5000);
  }

  updateElement(id, content) {
    const el = document.getElementById(id);
    if (el) el.textContent = content;
  }

  clearInput(id) {
    const el = document.getElementById(id);
    if (el) el.value = "";
  }

  getValue(id) {
    const el = document.getElementById(id);
    return el ? el.value : "";
  }

  setValue(id, value) {
    const el = document.getElementById(id);
    if (el) el.value = value;
  }

  setChecked(id, checked) {
    const el = document.getElementById(id);
    if (el) el.checked = checked;
  }

  getChecked(id) {
    const el = document.getElementById(id);
    return el ? el.checked : false;
  }

  show(id) {
    const el = document.getElementById(id);
    if (el) el.style.display = "";
  }

  hide(id) {
    const el = document.getElementById(id);
    if (el) el.style.display = "none";
  }

  toggleClass(id, className, condition) {
    const el = document.getElementById(id);
    if (el) el.classList.toggle(className, condition);
  }

  setDisabled(id, disabled) {
    const el = document.getElementById(id);
    if (el) el.disabled = disabled;
  }
}