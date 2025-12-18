// =============================
// MÓDULO: DASHBOARD
// =============================

export class DashboardManager {
  constructor(api, ui) {
    this.api = api;
    this.ui = ui;
    this.trafficChart = null;
    this.topIpChart = null;
  }

  async load() {
    try {
      const [messages, ips] = await Promise.all([
        this.api.getMessages(),
        this.api.getIPs(),
      ]);

      this.ui.updateElement("totalMessages", messages.length);
      this.ui.updateElement("totalIPs", ips.length);

      const todayMessages = this.getTodayMessages(messages);
      this.ui.updateElement("todayMessages", todayMessages);

      this.renderTrafficChart(messages);
      await this.renderTopIPsChart();
    } catch (err) {
      console.error(err);
      this.ui.toast("Error cargando datos del dashboard", "error");
    }
  }

  getTodayMessages(messages) {
    const todayStr = new Date().toISOString().slice(0, 10);
    return messages.filter(m => (m.createdAt || "").slice(0, 10) === todayStr).length;
  }

  renderTrafficChart(messages) {
    const { days, counts } = this.getLast7DaysData(messages);

    const ctx = document.getElementById("trafficChart").getContext("2d");
    if (this.trafficChart) this.trafficChart.destroy();
    
    this.trafficChart = new Chart(ctx, {
      type: "line",
      data: {
        labels: days,
        datasets: [{
          label: "Mensajes (7 días)",
          data: counts,
          borderWidth: 2,
          fill: false
        }],
      },
      options: {
        responsive: true,
        scales: {
          y: { beginAtZero: true }
        }
      },
    });
  }

  getLast7DaysData(messages) {
    const days = [];
    const counts = [];
    
    for (let i = 6; i >= 0; i--) {
      const dt = new Date();
      dt.setDate(dt.getDate() - i);
      const label = dt.toLocaleDateString();
      const isoDay = dt.toISOString().slice(0, 10);
      const count = messages.filter(m => (m.createdAt || "").slice(0, 10) === isoDay).length;
      days.push(label);
      counts.push(count);
    }
    
    return { days, counts };
  }

  async renderTopIPsChart() {
    try {
      const topIps = await this.api.getTopIPs();
      const labels = topIps.map(x => x._id);
      const vals = topIps.map(x => x.total);

      const canvasId = "topIpChart";
      if (!document.getElementById(canvasId)) {
        const c = document.createElement("canvas");
        c.id = canvasId;
        c.style.marginTop = "20px";
        document.getElementById("dashboard").appendChild(c);
      }

      const ctx = document.getElementById(canvasId).getContext("2d");
      if (this.topIpChart) this.topIpChart.destroy();
      
      this.topIpChart = new Chart(ctx, {
        type: "bar",
        data: {
          labels,
          datasets: [{
            label: "Top IPs",
            data: vals,
            borderWidth: 1
          }]
        },
        options: {
          responsive: true,
          scales: {
            y: { beginAtZero: true }
          }
        },
      });
    } catch {
      // Si no existe el endpoint, no rompe
    }
  }

  updateMessageCount() {
    const el = document.getElementById("totalMessages");
    if (el) {
      const current = parseInt(el.textContent || "0", 10) || 0;
      el.textContent = String(current + 1);
    }
  }
}