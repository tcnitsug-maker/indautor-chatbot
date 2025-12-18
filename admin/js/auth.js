/ =============================
// MÓDULO: AUTENTICACIÓN
// =============================

export class AuthManager {
  constructor() {
    this.token = localStorage.getItem("adminToken");
    this.adminInfo = this.parseJwt(this.token) || {};
    this.role = (this.adminInfo.role || "support").toLowerCase();
    this.username = this.adminInfo.username || "admin";
    this.ROLE_ORDER = ["support", "analyst", "editor", "super"];
  }

  isAuthenticated() {
    return !!this.token;
  }

  parseJwt(token) {
    try {
      const base64Url = token.split(".")[1];
      const base64 = base64Url.replace(/-/g, "+").replace(/_/g, "/");
      const jsonPayload = decodeURIComponent(
        atob(base64)
          .split("")
          .map(c => "%" + ("00" + c.charCodeAt(0).toString(16)).slice(-2))
          .join("")
      );
      return JSON.parse(jsonPayload);
    } catch {
      return null;
    }
  }

  logout() {
    localStorage.removeItem("adminToken");
    location.href = "/admin-login.html";
  }

  roleAtLeast(required) {
    return this.ROLE_ORDER.indexOf(this.role) >= this.ROLE_ORDER.indexOf(required);
  }

  checkAuth() {
    if (!this.token) {
      location.href = "/admin-login.html";
    }
  }

  getToken() {
    return this.token;
  }

  getRole() {
    return this.role;
  }

  getUsername() {
    return this.username;
  }
}