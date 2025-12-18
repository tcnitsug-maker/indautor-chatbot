// =============================
// MÓDULO: IPs Y MAPA
// =============================

export class IPsManager {
  constructor(api, ui, tabManager) {
    this.api = api;
    this.ui = ui;
    this.tabManager = tabManager;
    this.map = null;
    this.mapMarkers = [];
  }

  initMap() {
    if (this.map) return;
    this.map = L.map("map").setView([20, -100], 3);
    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      maxZoom: 18,
      attribution: "© OpenStreetMap contributors",
    }).addTo(this.map);
  }

  clearMapMarkers() {
    this.mapMarkers.forEach(m => m.remove());
    this.mapMarkers = [];
  }

  async load() {
    try {
      this.initMap();
      this.clearMapMarkers();

      const ips = await this.api.getIPs();
      const tbody = document.getElementById("ipTable");
      tbody.innerHTML = "";

      for (const item of ips) {
        await this.renderIPRow(tbody, item);
      }
    } catch (err) {
      console.error(err);
      this.ui.toast("Error cargando lista de IPs", "error");
    }
  }

  async renderIPRow(tbody, item) {
    const tr = document.createElement("tr");
    if (item.spam) tr.style.background = "#ffdddd";

    const tdIp = document.createElement("td");
    tdIp.textContent = item.ip;

    const tdTotal = document.createElement("td");
    tdTotal.textContent = item.total || 0;

    const tdLast = document.createElement("td");
    tdLast.textContent = this.ui.formatDate(item.lastSeen);

    const tdCity = document.createElement("td");
    tdCity.textContent = "...";

    const tdCountry = document.createElement("td");
    tdCountry.textContent = "...";

    const tdActions = document.createElement("td");
    const btnHist = document.createElement("button");
    btnHist.textContent = "📜 Historial";
    btnHist.onclick = () => {
      this.ui.setValue("ipSearch", item.ip);
      this.tabManager.setActiveTab("ipHistory");
    };
    tdActions.appendChild(btnHist);

    tr.appendChild(tdIp);
    tr.appendChild(tdTotal);
    tr.appendChild(tdLast);
    tr.appendChild(tdCity);
    tr.appendChild(tdCountry);
    tr.appendChild(tdActions);

    tbody.appendChild(tr);

    await this.loadIPGeoInfo(item, tdCity, tdCountry);
  }

  async loadIPGeoInfo(item, tdCity, tdCountry) {
    try {
      const info = await this.api.getIpInfo(item.ip);
      if (info && info.status === "success") {
        tdCity.textContent = info.city || "-";
        tdCountry.textContent = info.country || "-";

        if (info.lat && info.lon) {
          this.addMapMarker(info, item.ip);
        }
      } else {
        tdCity.textContent = "-";
        tdCountry.textContent = "-";
      }
    } catch {
      tdCity.textContent = "-";
      tdCountry.textContent = "-";
    }
  }

  addMapMarker(info, ip) {
    const marker = L.marker([info.lat, info.lon]).addTo(this.map);
    marker.bindPopup(
      `<b>${this.ui.escapeHtml(ip)}</b><br>${this.ui.escapeHtml(info.city || "")}, ${this.ui.escapeHtml(
        info.country || ""
      )}<br>${this.ui.escapeHtml(info.isp || "")}`
    );
    this.mapMarkers.push(marker);
  }

  async loadIPHistory() {
    const ip = this.ui.getValue("ipSearch").trim();
    if (!ip) return this.ui.toast("Escribe una IP", "error");

    try {
      const msgs = await this.api.getMessagesByIp(ip);
      const box = document.getElementById("ipHistoryBox");

      if (!msgs.length) {
        box.innerHTML = `<p>No hay mensajes para la IP <b>${this.ui.escapeHtml(ip)}</b>.</p>`;
        return;
      }

      let html = `<h3>Historial para IP: ${this.ui.escapeHtml(ip)}</h3><ul>`;
      msgs.forEach(m => {
        html += `<li><b>${this.ui.escapeHtml(m.role)}:</b> ${this.ui.escapeHtml(m.text)} <i>(${this.ui.formatDate(
          m.createdAt
        )})</i></li>`;
      });
      html += "</ul>";
      box.innerHTML = html;
    } catch (err) {
      console.error(err);
      this.ui.toast("Error cargando historial por IP", "error");
    }
  }
}