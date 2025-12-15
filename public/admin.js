// =====================================================
// AUTH
// =====================================================
const token = localStorage.getItem("token");
if (!token) location.href = "/admin-login.html";

function parseJwt(t) {
  try {
    const b = t.split(".")[1].replace(/-/g, "+").replace(/_/g, "/");
    return JSON.parse(
      decodeURIComponent(
        atob(b)
          .split("")
          .map(c => "%" + c.charCodeAt(0).toString(16).padStart(2, "0"))
          .join("")
      )
    );
  } catch {
    return {};
  }
}

const me = parseJwt(token);
const ROLE = (me.role || "support").toLowerCase();
const API = "/admin";

// =====================================================
// HELPERS
// =====================================================
const ROLE_ORDER = ["support", "analyst", "editor", "super"];
const can = r => ROLE_ORDER.indexOf(ROLE) >= ROLE_ORDER.indexOf(r);

function authHeaders(json = true) {
  const h = { Authorization: "Bearer " + token };
  if (json) h["Content-Type"] = "application/json";
  return h;
}

function esc(s = "") {
  return String(s)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

async function api(url, opts = {}) {
  opts.headers = { ...(opts.headers || {}), ...authHeaders(!!opts.body) };
  const r = await fetch(url, opts);
  const j = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(j.error || "Error");
  return j;
}

// =====================================================
// NAV
// =====================================================
function setTab(id) {
  document.querySelectorAll(".tab-content").forEach(s =>
    s.classList.toggle("active", s.id === id)
  );
  document.querySelectorAll("#navbar button").forEach(b =>
    b.classList.toggle("active", b.dataset.tab === id)
  );

  ({
    dashboard: loadDashboard,
    ips: loadIPs,
    security: loadBlockedIPs,
    ipHistory: () => {},
    messages: loadMessages,
    custom: loadCustom,
    videos: loadVideos,
    users: loadUsers,
    profile: loadProfile
  }[id] || (() => {}))();
}

document.addEventListener("DOMContentLoaded", () => {
  whoUser.textContent = me.username || "admin";
  whoRole.textContent = ROLE;
  document.querySelectorAll("#navbar button").forEach(
    b => (b.onclick = () => setTab(b.dataset.tab))
  );
  setTab("dashboard");
});

// =====================================================
// DASHBOARD
// =====================================================
async function loadDashboard() {
  const d = await api(`${API}/metrics`);
  totalMessages.textContent = d.totalMessages;
  totalIPs.textContent = d.totalIPs;
  todayMessages.textContent = d.todayMessages;

  if (window.trafficChart) window.trafficChart.destroy();
  trafficChart = new Chart(document.getElementById("trafficChart"), {
    type: "line",
    data: {
      labels: d.chart.labels,
      datasets: [{ label: "Mensajes", data: d.chart.values }]
    }
  });
}

// =====================================================
// IPS + MAP
// =====================================================
let map, markers = [];
function initMap() {
  if (map) return;
  map = L.map("map").setView([23.6, -102.5], 5);
  L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png").addTo(map);
}

async function loadIPs() {
  initMap();
  markers.forEach(m => m.remove());
  markers = [];

  const ips = await api(`${API}/ips`);
  ipTable.innerHTML = "";

  ips.forEach(i => {
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td>${i.ip}</td>
      <td>${i.total}</td>
      <td>${new Date(i.lastSeen).toLocaleString()}</td>
      <td>${i.city || "-"}</td>
      <td>${i.country || "-"}</td>
      <td><button onclick="viewIP('${i.ip}')">📜</button></td>
    `;
    ipTable.appendChild(tr);

    if (i.lat && i.lon) {
      markers.push(L.marker([i.lat, i.lon]).addTo(map));
    }
  });
}

// =====================================================
// HISTORIAL GENERAL
// =====================================================
async function loadMessages() {
  const rows = await api(`${API}/messages`);
  generalHistory.innerHTML = rows
    .map(
      r => `
      <tr>
        <td>${r.role}</td>
        <td>${esc(r.text)}</td>
        <td>${new Date(r.createdAt).toLocaleString()}</td>
      </tr>`
    )
    .join("");
}

// =====================================================
// CUSTOM REPLIES
// =====================================================
let customCache = [];

async function loadCustom() {
  customCache = await api(`${API}/custom-replies`);
  renderCustom(customCache);
  newCustom();
}

function renderCustom(list) {
  customTable.innerHTML = "";

  list.forEach(r => {
    customTable.innerHTML += `
      <tr>
        <td>${esc(r.trigger)}</td>
        <td>${r.type || "text"}</td>
        <td>${r.priority || 1}</td>
        <td>${r.enabled ? "ON" : "OFF"}</td>
        <td>
          <button onclick="editCustom('${r._id}')">✏️</button>
        </td>
      </tr>`;
  });
}

function newCustom() {
  customId.value = "";
  triggerInput.value = "";
  responseInput.value = "";
  keywordsInput.value = "";
  priorityInput.value = 10;
  typeInput.value = "text";
  enabledInput.checked = true;
  videoUrlInput.value = "";
  onTypeChange();
}

function editCustom(id) {
  const r = customCache.find(x => x._id === id);
  if (!r) return;
  customId.value = r._id;
  triggerInput.value = r.trigger;
  responseInput.value = r.response;
  keywordsInput.value = (r.keywords || []).join(", ");
  priorityInput.value = r.priority;
  typeInput.value = r.type;
  enabledInput.checked = r.enabled;
  videoUrlInput.value = r.video_url || "";
  onTypeChange();
}

async function saveCustom() {
  if (!can("editor")) return alert("Sin permisos");

  const payload = {
    trigger: triggerInput.value.trim(),
    response: responseInput.value.trim(),
    keywords: keywordsInput.value,
    priority: +priorityInput.value || 1,
    type: typeInput.value,
    enabled: enabledInput.checked,
    video_url:
      typeInput.value === "video" ? videoUrlInput.value.trim() : ""
  };

  if (!payload.trigger || !payload.response)
    return alert("Datos incompletos");

  const id = customId.value;
  await api(
    id ? `${API}/custom-replies/${id}` : `${API}/custom-replies`,
    {
      method: id ? "PUT" : "POST",
      body: JSON.stringify(payload)
    }
  );

  loadCustom();
}

function deleteCustom() {
  if (!can("super")) return alert("Solo super puede eliminar");
  if (!customId.value) return;
  if (!confirm("¿Eliminar esta respuesta?")) return;

  api(`${API}/custom-replies/${customId.value}`, { method: "DELETE" })
    .then(loadCustom);
}

function onTypeChange() {
  videoBox.classList.toggle("hidden", typeInput.value !== "video");
}

// =====================================================
// IMPORTAR EXCEL / CSV (TU HTML REAL)
// =====================================================
async function importCustomReplies() {
  if (!can("editor")) return alert("Sin permisos");

  const input = document.getElementById("customImportFile");
  if (!input.files.length) return alert("Selecciona archivo");

  const fd = new FormData();
  fd.append("file", input.files[0]);

  try {
    const r = await fetch("/admin/custom-replies/import-excel", {
      method: "POST",
      headers: { Authorization: "Bearer " + token },
      body: fd
    });
    const j = await r.json();
    if (!r.ok) throw new Error(j.error || "Error");

    alert(
      `Importado:\nCreados: ${j.created}\nActualizados: ${j.updated}\nOmitidos: ${j.skipped}`
    );
    loadCustom();
  } catch (e) {
    console.error(e);
    alert("Error importando Excel");
  }
}

// =====================================================
// EXPORTS
// =====================================================
async function downloadCustomTemplate() {
  const r = await fetch("/admin/custom-replies/template-xlsx", {
    headers: { Authorization: "Bearer " + token }
  });

  if (!r.ok) return alert("No se pudo descargar la plantilla");

  const blob = await r.blob();
  const url = URL.createObjectURL(blob);

  const a = document.createElement("a");
  a.href = url;
  a.download = "plantilla_respuestas.xlsx";
  document.body.appendChild(a);
  a.click();
  a.remove();

  URL.revokeObjectURL(url);
}

// =====================================================
// USERS
// =====================================================
async function loadUsers() {
  if (!can("super")) return;
  const u = await api(`${API}/users`);
  usersTable.innerHTML = u
    .map(
      x => `
      <tr>
        <td>${x.username}</td>
        <td>${x.role}</td>
        <td>${x.active ? "ON" : "OFF"}</td>
        <td>${new Date(x.createdAt).toLocaleString()}</td>
        <td></td>
      </tr>`
    )
    .join("");
}

// =====================================================
// PROFILE
// =====================================================
async function loadProfile() {
  const u = await api(`${API}/profile`);
  profileBox.innerHTML = `
    <b>Usuario:</b> ${esc(u.username)}<br>
    <b>Rol:</b> ${esc(u.role)}
  `;
}

async function changeMyPassword() {
  const currentPassword = myCurrentPassword.value;
  const newPassword = myNewPassword.value;
  if (!currentPassword || !newPassword) return alert("Faltan datos");

  await api(`${API}/profile/password`, {
    method: "PUT",
    body: JSON.stringify({ currentPassword, newPassword })
  });
  alert("Contraseña actualizada");
}

// =====================================================
// LOGOUT
// =====================================================
function logout() {
  localStorage.removeItem("token");
  location.href = "/admin-login.html";
}
