// =============================
// MÓDULO: API CLIENT
// =============================

export class ApiClient {
  constructor(authManager) {
    this.auth = authManager;
    this.baseUrl = "/admin";
  }

  async fetchJson(url, options = {}) {
    const token = this.auth.getToken();

    if (!token) {
      this.auth.logout();
      throw new Error("Sesión no iniciada");
    }

    const res = await fetch(url, {
      ...options,
      headers: {
        ...(options.headers || {}),
        "Content-Type": options.body ? "application/json" : (options.headers || {})["Content-Type"],
        "Authorization": "Bearer " + token,
      },
    });

    if (res.status === 401) {
      alert("Tu sesión expiró. Inicia sesión nuevamente.");
      this.auth.logout();
      throw new Error("Sesión expirada");
    }

    if (!res.ok) {
      const txt = await res.text();
      throw new Error(`Error ${res.status}: ${txt}`);
    }

    return res.json();
  }

  async downloadBlob(url, filename) {
    const token = this.auth.getToken();
    const r = await fetch(url, { headers: { Authorization: "Bearer " + token } });
    
    if (!r.ok) {
      throw new Error(await r.text());
    }
    
    const blob = await r.blob();
    const a = document.createElement("a");
    const u = URL.createObjectURL(blob);
    a.href = u;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(u), 3000);
  }

  getMessages() {
    return this.fetchJson(`${this.baseUrl}/messages`);
  }

  getMessagesByIp(ip) {
    return this.fetchJson(`${this.baseUrl}/messages/ip/${encodeURIComponent(ip)}`);
  }

  getIPs() {
    return this.fetchJson(`${this.baseUrl}/ips`);
  }

  getIpInfo(ip) {
    return this.fetchJson(`${this.baseUrl}/ipinfo/${encodeURIComponent(ip)}`);
  }

  getTopIPs() {
    return this.fetchJson(`${this.baseUrl}/stats/top-ips`);
  }

  getCustomReplies() {
    return this.fetchJson(`${this.baseUrl}/custom-replies`);
  }

  createCustomReply(data) {
    return this.fetchJson(`${this.baseUrl}/custom-replies`, {
      method: "POST",
      body: JSON.stringify(data)
    });
  }

  updateCustomReply(id, data) {
    return this.fetchJson(`${this.baseUrl}/custom-replies/${id}`, {
      method: "PUT",
      body: JSON.stringify(data)
    });
  }

  deleteCustomReply(id) {
    return this.fetchJson(`${this.baseUrl}/custom-replies/${id}`, {
      method: "DELETE"
    });
  }

  getVideos() {
    return this.fetchJson(`${this.baseUrl}/videos`);
  }

  deleteVideo(id) {
    return this.fetchJson(`${this.baseUrl}/videos/${id}`, {
      method: "DELETE"
    });
  }

  getUsers() {
    return this.fetchJson(`${this.baseUrl}/users`);
  }

  createUser(data) {
    return this.fetchJson(`${this.baseUrl}/users`, {
      method: "POST",
      body: JSON.stringify(data)
    });
  }

  updateUser(id, data) {
    return this.fetchJson(`${this.baseUrl}/users/${id}`, {
      method: "PUT",
      body: JSON.stringify(data)
    });
  }

  updateUserPassword(id, data) {
    return this.fetchJson(`${this.baseUrl}/users/${id}/password`, {
      method: "PUT",
      body: JSON.stringify(data)
    });
  }

  getProfile() {
    return this.fetchJson(`${this.baseUrl}/profile`);
  }

  updateMyPassword(data) {
    return this.fetchJson(`${this.baseUrl}/profile/password`, {
      method: "PUT",
      body: JSON.stringify(data)
    });
  }

  getBlockedIPs() {
    return this.fetchJson(`${this.baseUrl}/blocked-ips`);
  }

  blockIP(data) {
    return this.fetchJson(`${this.baseUrl}/block-ip`, {
      method: "POST",
      body: JSON.stringify(data)
    });
  }

  unblockIP(ip) {
    return this.fetchJson(`${this.baseUrl}/unblock-ip`, {
      method: "POST",
      body: JSON.stringify({ ip })
    });
  }

  getSettings() {
    return this.fetchJson(`${this.baseUrl}/settings`);
  }

  updateAiLimit(limit) {
    return this.fetchJson(`${this.baseUrl}/settings/ai-limit`, {
      method: "PUT",
      body: JSON.stringify({ ai_daily_limit_per_ip: limit })
    });
  }
}