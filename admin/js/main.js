// =============================
// ARCHIVO PRINCIPAL - INICIALIZACIÓN
// =============================

import { AuthManager } from './auth.js';
import { ApiClient } from './api.js';
import { UIManager } from './ui.js';
import { TabManager } from './tabManager.js';
import { DashboardManager } from './dashboard.js';
import { IPsManager } from './ips.js';
import { MessagesManager } from './messages.js';
import { VideosManager } from './videos.js';
import { CustomRepliesManager } from './customReplies.js';
import { UsersManager } from './users.js';
import { ProfileManager } from './profile.js';
import { SecurityManager } from './security.js';
import { RealtimeManager } from './realtime.js';

// =============================
// INICIALIZACIÓN DE LA APP
// =============================

class AdminApp {
  constructor() {
    this.auth = new AuthManager();
    this.auth.checkAuth();
    
    this.api = new ApiClient(this.auth);
    this.ui = new UIManager();
    this.tabManager = new TabManager(this.ui);
    
    this.dashboard = new DashboardManager(this.api, this.ui);
    this.videos = new VideosManager(this.api, this.ui, this.auth);
    this.customReplies = new CustomRepliesManager(this.api, this.ui, this.auth, this.videos);
    this.ips = new IPsManager(this.api, this.ui, this.tabManager);
    this.messages = new MessagesManager(this.api, this.ui);
    this.users = new UsersManager(this.api, this.ui, this.auth);
    this.profile = new ProfileManager(this.api, this.ui);
    this.security = new SecurityManager(this.api, this.ui, this.auth);
    
    this.realtime = new RealtimeManager(this.auth, this.ui, this.dashboard, this.messages);
  }

  init() {
    this.setupUI();
    this.registerTabs();
    this.exposeManagers();
    this.tabManager.init();
    this.tabManager.setActiveTab("dashboard");
    this.realtime.init();
  }

  setupUI() {
    const whoUser = document.getElementById("whoUser");
    const whoRole = document.getElementById("whoRole");

    if (whoUser) whoUser.textContent = this.auth.getUsername();
    if (whoRole) whoRole.textContent = this.auth.getRole();
  }

  registerTabs() {
    this.tabManager.registerTab("dashboard", () => this.dashboard.load());
    this.tabManager.registerTab("ips", () => this.ips.load());
    this.tabManager.registerTab("ipHistory", () => this.ips.loadIPHistory());
    this.tabManager.registerTab("messages", () => this.messages.loadGeneralHistory());
    this.tabManager.registerTab("custom", () => this.customReplies.load());
    this.tabManager.registerTab("videos", () => this.videos.load());
    this.tabManager.registerTab("users", () => this.users.load());
    this.tabManager.registerTab("profile", () => this.profile.load());
    this.tabManager.registerTab("security", () => {
      this.security.loadBlockedIPs();
      this.security.loadSettings();
    });
  }

  exposeManagers() {
    // Exponemos managers globalmente para que los onclick del HTML funcionen
    window.logout = () => this.auth.logout();
    window.customRepliesManager = this.customReplies;
    window.videosManager = this.videos;
    window.usersManager = this.users;
    window.profileManager = this.profile;
    window.securityManager = this.security;
    window.ipsManager = this.ips;
  }
}

// =============================
// INICIAR LA APLICACIÓN
// =============================

document.addEventListener("DOMContentLoaded", () => {
  const app = new AdminApp();
  app.init();
});