// =============================
// CONFIGURACIÓN BÁSICA
// =============================

// Usamos rutas relativas para que funcione en Render, local, etc.
const ADMIN_API = "/admin";
const CUSTOM_URL = `${ADMIN_API}/custom-replies`;

// Referencias globales
let trafficChart = null;
let map = null;
let mapMarkers = [];

// =============================
// UTILIDADES
// =============================

function formatDate(iso) {
  if (!iso) return "";
  const d = new Date(iso);
  return d.toLocaleString();
}

function escapeHtml(text) {
  return String(text || "")
    .replace(/&/g, "&amp;")
    .replace(/`/g, "&#96;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

async function fetchJson(url, options = {}) {
  const res = await fetch(url, options);
  if (!res.ok) {
    const txt = await res.text();
    throw new Error(`Error ${res.status}: ${txt}`);
  }
  return res.json();
}

// =============================
// TABS / NAVEGACIÓN
// =============================

function setActiveTab(tabId) {
  document.querySelectorAll(".tab-content").forEach((sec) => {
    sec.classList.toggle("active", sec.id === tabId);
  });

  document.querySelectorAll("#navbar button").forEach((btn) => {
    btn.classList.toggle("active", btn.getAttribute("data-tab") === tabId);
  });

  // Cargar datos según la pestaña
  if (tabId === "dashboard") {
    loadDashboard();
  } else if (tabId === "ips") {
    loadIPs();
  } else if (tabId === "ipHistory") {
    // no cargamos nada automático; se carga al buscar
  } else if (tabId === "messages") {
    loadGeneralHistory();
  } else if (tabId === "custom") {
    loadCustomReplies();
  }
}

document.addEventListener("DOMContentLoaded", () => {
  // Evento de botones de navbar
  document.querySelectorAll("#navbar button").forEach((btn) => {
    btn.addEventListener("click", () => {
      const tabId = btn.getAttribute("data-tab");
      setActiveTab(tabId);
    });
  });

  // Activar dashboard por defecto
  setActiveTab("dashboard");
});

// =============================
// DASHBOARD GENERAL
// =============================

async function loadDashboard() {
  try {
    const [messages, ips] = await Promise.all([
      fetchJson(`${ADMIN_API}/messages`),
      fetchJson(`${ADMIN_API}/ips`),
    ]);

    // Total de mensajes
    const totalMessages = messages.length;
    document.getElementById("totalMessages").textContent = totalMessages;

    // Total de IPs únicas
    const totalIPs = ips.length;
    document.getElementById("totalIPs").textContent = totalIPs;

    // Mensajes de hoy
    const today = new Date();
    const todayStr = today.toISOString().slice(0, 10); // YYYY-MM-DD
    const todayMessages = messages.filter((m) => {
      if (!m.createdAt) return false;
      const d = new Date(m.createdAt);
      const dStr = d.toISOString().slice(0, 10);
      return dStr === todayStr;
    }).length;
    document.getElementById("todayMessages").textContent = todayMessages;

    // Construir datos de los últimos 7 días
    const days = [];
    const counts = [];
    for (let i = 6; i >= 0; i--) {
      const dt = new Date();
      dt.setDate(dt.getDate() - i);
      const label = dt.toLocaleDateString();
      const isoDay = dt.toISOString().slice(0, 10);
      const count = messages.filter((m) => {
        if (!m.createdAt) return false;
        const d = new Date(m.createdAt);
        return d.toISOString().slice(0, 10) === isoDay;
      }).length;
      days.push(label);
      counts.push(count);
    }

    // Dibujar gráfico
    const ctx = document.getElementById("trafficChart").getContext("2d");
    if (trafficChart) {
      trafficChart.destroy();
    }
    trafficChart = new Chart(ctx, {
      type: "line",
      data: {
        labels: days,
        datasets: [
          {
            label: "Mensajes por día (últimos 7 días)",
            data: counts,
            borderWidth: 2,
            fill: false,
          },
        ],
      },
      options: {
        responsive: true,
        scales: {
          y: {
            beginAtZero: true,
            precision: 0,
          },
        },
      },
    });
  } catch (err) {
    console.error("Error en dashboard:", err);
    alert("Error cargando datos del dashboard");
  }
}

// =============================
// MAPA + LISTADO DE IPs
// =============================

function initMap() {
  if (map) return; // ya creado
  map = L.map("map").setView([20, -100], 3); // centro aproximado

  L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
    maxZoom: 18,
    attribution: "© OpenStreetMap contributors",
  }).addTo(map);
}

function clearMapMarkers() {
  if (!mapMarkers) return;
  mapMarkers.forEach((m) => m.remove());
  mapMarkers = [];
}

async function loadIPs() {
  try {
    initMap();
    clearMapMarkers();

    const ips = await fetchJson(`${ADMIN_API}/ips`);
    const tbody = document.getElementById("ipTable");
    tbody.innerHTML = "";

    // Para cada IP, además de mostrarla, consultamos info geográfica
    for (const item of ips) {
      const tr = document.createElement("tr");

      const tdIp = document.createElement("td");
      tdIp.textContent = item.ip;

      const tdTotal = document.createElement("td");
      tdTotal.textContent = item.total || 0;

      const tdLast = document.createElement("td");
      tdLast.textContent = formatDate(item.lastSeen);

      const tdCity = document.createElement("td");
      tdCity.textContent = "...";

      const tdCountry = document.createElement("td");
      tdCountry.textContent = "...";

      const tdActions = document.createElement("td");
      const btnHist = document.createElement("button");
      btnHist.textContent = "📜 Historial";
      btnHist.onclick = () => {
        document.getElementById("ipSearch").value = item.ip;
        setActiveTab("ipHistory");
        loadIPHistory();
      };
      tdActions.appendChild(btnHist);

      tr.appendChild(tdIp);
      tr.appendChild(tdTotal);
      tr.appendChild(tdLast);
      tr.appendChild(tdCity);
      tr.appendChild(tdCountry);
      tr.appendChild(tdActions);

      tbody.appendChild(tr);

      // Cargar info IP y marcador en el mapa
      try {
        const info = await fetchJson(`${ADMIN_API}/ipinfo/${encodeURIComponent(item.ip)}`);
        if (info && info.status === "success") {
          tdCity.textContent = info.city || "-";
          tdCountry.textContent = info.country || "-";

          if (info.lat && info.lon && map) {
            const marker = L.marker([info.lat, info.lon]).addTo(map);
            marker.bindPopup(
              `<b>${item.ip}</b><br>${info.city || ""}, ${info.country || ""}<br>${info.isp || ""}`
            );
            mapMarkers.push(marker);
          }
        } else {
          tdCity.textContent = "-";
          tdCountry.textContent = "-";
        }
      } catch (geoErr) {
        console.warn("Error obteniendo info de IP:", item.ip, geoErr);
        tdCity.textContent = "-";
        tdCountry.textContent = "-";
      }
    }
  } catch (err) {
    console.error("Error cargando IPs:", err);
    alert("Error cargando lista de IPs");
  }
}

// =============================
// HISTORIAL POR IP
// =============================

async function loadIPHistory() {
  const ip = document.getElementById("ipSearch").value.trim();
  if (!ip) {
    alert("Escribe una IP");
    return;
  }

  try {
    const msgs = await fetchJson(`${ADMIN_API}/messages/ip/${encodeURIComponent(ip)}`);
    const box = document.getElementById("ipHistoryBox");

    if (!msgs.length) {
      box.innerHTML = `<p>No hay mensajes para la IP <b>${ip}</b>.</p>`;
      return;
    }

    let html = `<h3>Historial para IP: ${ip}</h3><ul>`;
    msgs.forEach((m) => {
      html += `<li><b>${escapeHtml(m.role)}:</b> ${escapeHtml(m.text)} <i>(${formatDate(
        m.createdAt
      )})</i></li>`;
    });
    html += "</ul>";
    box.innerHTML = html;
  } catch (err) {
    console.error("Error en historial por IP:", err);
    alert("Error cargando historial por IP");
  }
}

// =============================
// HISTORIAL GENERAL (MENSAJES)
// =============================

async function loadGeneralHistory() {
  try {
    const msgs = await fetchJson(`${ADMIN_API}/messages`);
    const tbody = document.getElementById("generalHistory");
    tbody.innerHTML = "";

    msgs.forEach((m) => {
      const tr = document.createElement("tr");

      const tdRole = document.createElement("td");
      tdRole.textContent = m.role;

      const tdText = document.createElement("td");
      tdText.innerHTML = `<div class="small">${escapeHtml(m.text)}</div>`;

      const tdDate = document.createElement("td");
      tdDate.textContent = formatDate(m.createdAt);

      tr.appendChild(tdRole);
      tr.appendChild(tdText);
      tr.appendChild(tdDate);

      tbody.appendChild(tr);
    });
  } catch (err) {
    console.error("Error cargando historial general:", err);
    alert("Error cargando historial de mensajes");
  }
}

// =============================
// RESPUESTAS PERSONALIZADAS
// =============================

async function loadCustomReplies() {
  try {
    const replies = await fetchJson(CUSTOM_URL);
    const tbody = document.getElementById("customTable");
    tbody.innerHTML = "";

    replies.forEach((r) => {
      const tr = document.createElement("tr");

      const tdQ = document.createElement("td");
      tdQ.innerHTML = `<div class="small">${escapeHtml(r.question)}</div>`;

      const tdA = document.createElement("td");
      tdA.innerHTML = `<div class="small">${escapeHtml(r.answer)}</div>`;

      const tdK = document.createElement("td");
      const kws = (r.keywords || []).join(", ");
      tdK.innerHTML = `<div class="small">${escapeHtml(kws)}</div>`;

      const tdDel = document.createElement("td");
      const btnDel = document.createElement("button");
      btnDel.textContent = "🗑️";
      btnDel.onclick = () => deleteCustom(r._id);
      tdDel.appendChild(btnDel);

      tr.appendChild(tdQ);
      tr.appendChild(tdA);
      tr.appendChild(tdK);
      tr.appendChild(tdDel);

      tbody.appendChild(tr);
    });
  } catch (err) {
    console.error("Error cargando custom replies:", err);
    alert("Error cargando respuestas personalizadas");
  }
}

async function addCustom() {
  const question = document.getElementById("qInput").value.trim();
  const answer = document.getElementById("aInput").value.trim();
  const keywordsStr = document.getElementById("kInput").value.trim();

  if (!question || !answer) {
    alert("Pregunta y respuesta son obligatorias.");
    return;
  }

  const payload = {
    question,
    answer,
    keywords: keywordsStr
      ? keywordsStr.split(",").map((s) => s.trim()).filter(Boolean)
      : [],
    enabled: true,
  };

  try {
    await fetchJson(CUSTOM_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    document.getElementById("qInput").value = "";
    document.getElementById("aInput").value = "";
    document.getElementById("kInput").value = "";

    loadCustomReplies();
  } catch (err) {
    console.error("Error agregando custom:", err);
    alert("Error agregando respuesta personalizada");
  }
}

async function deleteCustom(id) {
  if (!confirm("¿Eliminar esta respuesta personalizada?")) return;

  try {
    await fetchJson(`${CUSTOM_URL}/${id}`, { method: "DELETE" });
    loadCustomReplies();
  } catch (err) {
    console.error("Error eliminando custom:", err);
    alert("Error eliminando respuesta personalizada");
  }
}
