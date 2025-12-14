// =============================
// AUTH (obligatorio)
// =============================
const token = localStorage.token;
if (!token) location.href = "/admin-login.html";


function parseJwt(token) {
  try {
    const base64Url = token.split(".")[1];
    const base64 = base64Url.replace(/-/g, "+").replace(/_/g, "/");
    const jsonPayload = decodeURIComponent(atob(base64).split("").map(c => "%" + ("00" + c.charCodeAt(0).toString(16)).slice(-2)).join(""));
    return JSON.parse(jsonPayload);
  } catch { return null; }
}

const adminInfo = parseJwt(token) || {};
const ADMIN_ROLE = (adminInfo.role || "support").toLowerCase();

// helpers permisos
const ROLE_ORDER = ["support","analyst","editor","super"];
function roleAtLeast(required) {
  return ROLE_ORDER.indexOf(ADMIN_ROLE) >= ROLE_ORDER.indexOf(required);
}

// =============================
// CONFIG
// =============================
const ADMIN_API = "/admin";
const CUSTOM_URL = `${ADMIN_API}/custom-replies`;

let trafficChart = null;
let topIpChart = null;

let map = null;
let mapMarkers = [];

// =============================
// UTIL
// =============================
function formatDate(iso) {
  if (!iso) return "";
  return new Date(iso).toLocaleString();
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
  options.headers = {
    ...(options.headers || {}),
    "Content-Type": options.body ? "application/json" : (options.headers || {})["Content-Type"],
    Authorization: "Bearer " + token,
  };

  const res = await fetch(url, options);
  if (!res.ok) {
    const txt = await res.text();
    throw new Error(`Error ${res.status}: ${txt}`);
  }
  return res.json();
}

// =============================
// TOASTS (notificaciones)
// =============================
function ensureToastRoot() {
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

function toast(msg, type = "info") {
  ensureToastRoot();
  const root = document.getElementById("toastRoot");
  const t = document.createElement("div");
  t.style.background = type === "error" ? "#ffdddd" : type === "success" ? "#ddffdd" : "#ffffff";
  t.style.border = "1px solid #ccc";
  t.style.borderRadius = "10px";
  t.style.padding = "10px 12px";
  t.style.boxShadow = "0 2px 10px rgba(0,0,0,.2)";
  t.style.maxWidth = "320px";
  t.innerHTML = `<div style="font-weight:700;margin-bottom:4px;">${type.toUpperCase()}</div>
                 <div style="font-size:14px;">${escapeHtml(msg)}</div>`;
  root.appendChild(t);
  setTimeout(() => t.remove(), 5000);
}

// =============================
// TABS
// =============================
function setActiveTab(tabId) {
  document.querySelectorAll(".tab-content").forEach((sec) => {
    sec.classList.toggle("active", sec.id === tabId);
  });
  document.querySelectorAll("#navbar button").forEach((btn) => {
    btn.classList.toggle("active", btn.getAttribute("data-tab") === tabId);
  });

  if (tabId === "dashboard") loadDashboard();
  if (tabId === "ips") loadIPs();
  if (tabId === "messages") loadGeneralHistory();
  if (tabId === "custom") loadCustomReplies();
  if (tabId === "videos") loadVideos();
}

document.addEventListener("DOMContentLoaded", () => {
  document.querySelectorAll("#navbar button").forEach((btn) => {
    btn.addEventListener("click", () => setActiveTab(btn.getAttribute("data-tab")));
  });
  setActiveTab("dashboard");
});

// =============================
// DASHBOARD
// =============================
async function loadDashboard() {
  try {
    const [messages, ips] = await Promise.all([
      fetchJson(`${ADMIN_API}/messages`),
      fetchJson(`${ADMIN_API}/ips`),
    ]);

    document.getElementById("totalMessages").textContent = messages.length;
    document.getElementById("totalIPs").textContent = ips.length;

    const todayStr = new Date().toISOString().slice(0, 10);
    const todayMessages = messages.filter((m) => (m.createdAt || "").slice(0, 10) === todayStr).length;
    document.getElementById("todayMessages").textContent = todayMessages;

    // Mensajes por día (7 días)
    const days = [];
    const counts = [];
    for (let i = 6; i >= 0; i--) {
      const dt = new Date();
      dt.setDate(dt.getDate() - i);
      const label = dt.toLocaleDateString();
      const isoDay = dt.toISOString().slice(0, 10);
      const count = messages.filter((m) => (m.createdAt || "").slice(0, 10) === isoDay).length;
      days.push(label);
      counts.push(count);
    }

    const ctx = document.getElementById("trafficChart").getContext("2d");
    if (trafficChart) trafficChart.destroy();
    trafficChart = new Chart(ctx, {
      type: "line",
      data: {
        labels: days,
        datasets: [{ label: "Mensajes (7 días)", data: counts, borderWidth: 2, fill: false }],
      },
      options: { responsive: true, scales: { y: { beginAtZero: true } } },
    });

    // Top IPs (opcional si ya lo tienes)
    try {
      const topIps = await fetchJson(`${ADMIN_API}/stats/top-ips`);
      const labels = topIps.map((x) => x._id);
      const vals = topIps.map((x) => x.total);

      const canvasId = "topIpChart";
      if (!document.getElementById(canvasId)) {
        const c = document.createElement("canvas");
        c.id = canvasId;
        c.style.marginTop = "20px";
        document.getElementById("dashboard").appendChild(c);
      }

      const ctx2 = document.getElementById(canvasId).getContext("2d");
      if (topIpChart) topIpChart.destroy();
      topIpChart = new Chart(ctx2, {
        type: "bar",
        data: { labels, datasets: [{ label: "Top IPs", data: vals, borderWidth: 1 }] },
        options: { responsive: true, scales: { y: { beginAtZero: true } } },
      });
    } catch {
      // si no existe /stats/top-ips no rompe
    }
  } catch (err) {
    console.error(err);
    toast("Error cargando datos del dashboard", "error");
  }
}

// =============================
// MAPA + IPs
// =============================
function initMap() {
  if (map) return;
  map = L.map("map").setView([20, -100], 3);
  L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
    maxZoom: 18,
    attribution: "© OpenStreetMap contributors",
  }).addTo(map);
}

function clearMapMarkers() {
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

    for (const item of ips) {
      const tr = document.createElement("tr");
      if (item.spam) tr.style.background = "#ffdddd";

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

      // Geo info + marker
      try {
        const info = await fetchJson(`${ADMIN_API}/ipinfo/${encodeURIComponent(item.ip)}`);
        if (info && info.status === "success") {
          tdCity.textContent = info.city || "-";
          tdCountry.textContent = info.country || "-";

          if (info.lat && info.lon) {
            const marker = L.marker([info.lat, info.lon]).addTo(map);
            marker.bindPopup(
              `<b>${escapeHtml(item.ip)}</b><br>${escapeHtml(info.city || "")}, ${escapeHtml(
                info.country || ""
              )}<br>${escapeHtml(info.isp || "")}`
            );
            mapMarkers.push(marker);
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
  } catch (err) {
    console.error(err);
    toast("Error cargando lista de IPs", "error");
  }
}

// =============================
// HISTORIAL POR IP
// =============================
async function loadIPHistory() {
  const ip = document.getElementById("ipSearch").value.trim();
  if (!ip) return toast("Escribe una IP", "error");

  try {
    const msgs = await fetchJson(`${ADMIN_API}/messages/ip/${encodeURIComponent(ip)}`);
    const box = document.getElementById("ipHistoryBox");

    if (!msgs.length) {
      box.innerHTML = `<p>No hay mensajes para la IP <b>${escapeHtml(ip)}</b>.</p>`;
      return;
    }

    let html = `<h3>Historial para IP: ${escapeHtml(ip)}</h3><ul>`;
    msgs.forEach((m) => {
      html += `<li><b>${escapeHtml(m.role)}:</b> ${escapeHtml(m.text)} <i>(${formatDate(
        m.createdAt
      )})</i></li>`;
    });
    html += "</ul>";
    box.innerHTML = html;
  } catch (err) {
    console.error(err);
    toast("Error cargando historial por IP", "error");
  }
}

// =============================
// HISTORIAL GENERAL
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
    console.error(err);
    toast("Error cargando historial general", "error");
  }
}

// =============================
// CUSTOM REPLIES
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
      tdK.innerHTML = `<div class="small">${escapeHtml((r.keywords || []).join(", "))}</div>`;

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
    console.error(err);
    toast("Error cargando respuestas personalizadas", "error");
  }
}

async function addCustom() {
  const question = document.getElementById("qInput").value.trim();
  const answer = document.getElementById("aInput").value.trim();
  const keywordsStr = document.getElementById("kInput").value.trim();

  if (!question || !answer) return toast("Pregunta y respuesta son obligatorias", "error");

  const payload = {
    question,
    answer,
    keywords: keywordsStr
      ? keywordsStr.split(",").map((s) => s.trim()).filter(Boolean)
      : [],
    enabled: true,
  };

  try {
    await fetchJson(CUSTOM_URL, { method: "POST", body: JSON.stringify(payload) });
    document.getElementById("qInput").value = "";
    document.getElementById("aInput").value = "";
    document.getElementById("kInput").value = "";
    toast("Respuesta personalizada guardada", "success");
    loadCustomReplies();
  } catch (err) {
    console.error(err);
    toast("Error agregando respuesta personalizada", "error");
  }
}

async function deleteCustom(id) {
  if (!confirm("¿Eliminar esta respuesta personalizada?")) return;
  try {
    await fetchJson(`${CUSTOM_URL}/${id}`, { method: "DELETE" });
    toast("Eliminada", "success");
    loadCustomReplies();
  } catch (err) {
    console.error(err);
    toast("Error eliminando", "error");
  }
}

// =============================
// SOCKET.IO REALTIME
// =============================
(function initRealtime() {
  // socket.io client viene desde CDN en admin.html (si no lo tienes, te lo doy en el módulo 3)
  if (typeof io === "undefined") {
    console.warn("socket.io client no está cargado");
    return;
  }

  const socket = io({
    auth: { token },
  });

  socket.on("connect", () => {
    toast("Tiempo real conectado", "success");
  });

  socket.on("connect_error", (err) => {
    console.error("Socket error:", err);
    toast("Tiempo real no autorizado / token inválido", "error");
  });

  socket.on("new_message", (msg) => {
    // Notificación solo para mensajes de usuario
    if (msg?.role === "user") {
      toast(`Nuevo mensaje (${msg.ip || "IP?"}): ${String(msg.text || "").slice(0, 80)}...`, "info");
    }

    // Si estás en historial general, inserta arriba
    const active = document.querySelector(".tab-content.active")?.id;
    if (active === "messages") {
      const tbody = document.getElementById("generalHistory");
      if (tbody) {
        const tr = document.createElement("tr");
        const tdRole = document.createElement("td");
        tdRole.textContent = msg.role;

        const tdText = document.createElement("td");
        tdText.innerHTML = `<div class="small">${escapeHtml(msg.text)}</div>`;

        const tdDate = document.createElement("td");
        tdDate.textContent = formatDate(msg.createdAt);

        tr.appendChild(tdRole);
        tr.appendChild(tdText);
        tr.appendChild(tdDate);

        // arriba = más nuevo
        tbody.prepend(tr);
      }
    }

    // Actualización rápida de contadores del dashboard si está visible
    if (active === "dashboard") {
      // Incrementar total mensajes “rápido”
      const el = document.getElementById("totalMessages");
      if (el) el.textContent = String((parseInt(el.textContent || "0", 10) || 0) + 1);

      // Si quieres exactitud perfecta, recarga dashboard (más pesado):
      // loadDashboard();
    }
  });

  socket.on("spam_alert", (data) => {
    toast(`SPAM/FLOOD detectado de IP ${data.ip} (bloqueo temporal)`, "error");
  });
})();


// =============================
// CUSTOM REPLIES PRO
// =============================
let customCache = [];
let videosCache = [];

function onTypeChange() {
  const type = document.getElementById("typeInput")?.value;
  const box = document.getElementById("videoBox");
  if (!box) return;
  box.classList.toggle("hidden", type !== "video");
  renderVideoPreview();
}

function renderVideoPreview() {
  const prev = document.getElementById("videoPreview");
  if (!prev) return;
  const sel = document.getElementById("videoSelect");
  const urlInput = document.getElementById("videoUrlInput");
  const chosenId = sel?.value || "";
  const external = (urlInput?.value || "").trim();
  const chosen = videosCache.find(v => v._id === chosenId);
  const src = external || chosen?.url || "";

  if (!src) { prev.innerHTML = "<div class='hint'>Sin vista previa</div>"; return; }

  if (src.includes("youtube.com") || src.includes("youtu.be") || src.includes("/embed/")) {
    prev.innerHTML = `<iframe width="100%" height="240" src="${src}" frameborder="0" allowfullscreen></iframe>`;
  } else {
    prev.innerHTML = `<video src="${src}" controls style="width:100%;max-height:260px;border-radius:10px"></video>`;
  }
}

function fillVideoSelect(selectedId = "") {
  const sel = document.getElementById("videoSelect");
  if (!sel) return;
  sel.innerHTML = `<option value="">(ninguno)</option>` + videosCache.map(v => 
    `<option value="${v._id}" ${v._id===selectedId?'selected':''}>${v.originalName}</option>`
  ).join("");
  sel.onchange = renderVideoPreview;
}

function newCustom() {
  document.getElementById("customId").value = "";
  document.getElementById("triggerInput").value = "";
  document.getElementById("responseInput").value = "";
  document.getElementById("keywordsInput").value = "";
  document.getElementById("priorityInput").value = 10;
  document.getElementById("typeInput").value = "text";
  document.getElementById("enabledInput").checked = true;
  document.getElementById("videoUrlInput").value = "";
  fillVideoSelect("");
  onTypeChange();
  document.getElementById("btnDeleteCustom").style.display = "none";
}

function applyPermsToCustomForm() {
  const hint = document.getElementById("permHint");
  const canEdit = roleAtLeast("editor");
  const canDelete = roleAtLeast("super");

  // disable inputs if no edit
  ["triggerInput","responseInput","keywordsInput","priorityInput","typeInput","enabledInput","videoSelect","videoUrlInput"]
    .forEach(id => { const el=document.getElementById(id); if(el) el.disabled = !canEdit; });

  const btnNew = document.getElementById("btnNewCustom");
  if (btnNew) btnNew.style.display = canEdit ? "inline-block" : "none";

  const del = document.getElementById("btnDeleteCustom");
  if (del) del.style.display = canDelete ? (document.getElementById("customId").value ? "inline-block":"none") : "none";

  if (hint) {
    hint.innerHTML = canEdit ? "" : "🔒 Tu perfil no puede editar respuestas. Pide acceso de editor/super.";
  }

  const saveBtn = document.querySelector("#custom .btn.primary");
  if (saveBtn) saveBtn.style.display = canEdit ? "inline-block" : "none";
}

async function loadCustomReplies() {
  try {
    await loadVideos(true); // precargar videos para selector
    const r = await fetch(CUSTOM_URL, { headers: { Authorization: "Bearer " + token }});
    customCache = await r.json();

    renderCustomTable(customCache);
    newCustom();
    applyPermsToCustomForm();

    const search = document.getElementById("customSearch");
    if (search) {
      search.oninput = () => {
        const q = search.value.toLowerCase().trim();
        const filtered = !q ? customCache : customCache.filter(x => {
          const t = (x.trigger||x.question||"").toLowerCase();
          const kws = (x.keywords||[]).join(",").toLowerCase();
          return t.includes(q) || kws.includes(q);
        });
        renderCustomTable(filtered);
      };
    }

  } catch (e) {
    toast("No se pudieron cargar respuestas", "error");
    console.error(e);
  }
}

function renderCustomTable(rows) {
  const tbody = document.getElementById("customTable");
  if (!tbody) return;
  tbody.innerHTML = "";
  rows.forEach(r => {
    const tr = document.createElement("tr");
    const trig = r.trigger || r.question || "";
    const type = r.type || "text";
    const pr = r.priority ?? 1;
    const enabled = r.enabled !== false;

    tr.innerHTML = `
      <td>${escapeHtml(trig)}</td>
      <td><span class="badge ${type}">${type}</span></td>
      <td>${pr}</td>
      <td><span class="badge ${enabled?'':'off'}">${enabled?'ON':'OFF'}</span></td>
      <td>
        <button class="btn" onclick="editCustom('${r._id}')">✏️</button>
        ${roleAtLeast("super") ? `<button class="btn danger" onclick="deleteCustomById('${r._id}')">🗑️</button>` : ``}
      </td>
    `;
    tbody.appendChild(tr);
  });
}

function editCustom(id) {
  const r = customCache.find(x => x._id === id);
  if (!r) return;

  document.getElementById("customId").value = r._id;
  document.getElementById("triggerInput").value = r.trigger || r.question || "";
  document.getElementById("responseInput").value = r.response || r.answer || "";
  document.getElementById("keywordsInput").value = Array.isArray(r.keywords) ? r.keywords.join(", ") : "";
  document.getElementById("priorityInput").value = r.priority ?? 10;
  document.getElementById("typeInput").value = r.type || "text";
  document.getElementById("enabledInput").checked = r.enabled !== false;

  document.getElementById("videoUrlInput").value = r.video_url || "";
  // if stored file, try to match by url
  const match = videosCache.find(v => v.url === r.video_file);
  fillVideoSelect(match?._id || "");
  onTypeChange();
  applyPermsToCustomForm();

  if (roleAtLeast("super")) {
    document.getElementById("btnDeleteCustom").style.display = "inline-block";
  }
}

async function saveCustom() {
  if (!roleAtLeast("editor")) return toast("Sin permiso para editar", "error");

  const id = document.getElementById("customId").value;
  const trigger = document.getElementById("triggerInput").value.trim();
  const response = document.getElementById("responseInput").value.trim();
  const keywords = document.getElementById("keywordsInput").value;
  const priority = Number(document.getElementById("priorityInput").value || 1);
  const type = document.getElementById("typeInput").value;
  const enabled = document.getElementById("enabledInput").checked;

  const vidSelId = document.getElementById("videoSelect").value;
  const external = document.getElementById("videoUrlInput").value.trim();
  const chosen = videosCache.find(v => v._id === vidSelId);

  const payload = {
    trigger,
    response,
    keywords,
    priority,
    type,
    enabled,
    video_url: type === "video" ? external : "",
    video_file: type === "video" ? (external ? "" : (chosen?.url || "")) : "",
    video_name: type === "video" ? (chosen?.originalName || "") : ""
  };

  if (!trigger || !response) return toast("Trigger y respuesta son obligatorios", "error");

  try {
    const url = id ? `${CUSTOM_URL}/${id}` : CUSTOM_URL;
    const method = id ? "PUT" : "POST";
    const r = await fetch(url, {
      method,
      headers: { "Content-Type": "application/json", Authorization: "Bearer " + token },
      body: JSON.stringify(payload),
    });
    const data = await r.json();
    if (!r.ok) throw new Error(data.error || "Error guardando");

    toast("Guardado", "success");
    await loadCustomReplies();
  } catch (e) {
    console.error(e);
    toast(e.message || "Error", "error");
  }
}

async function deleteCustom() {
  const id = document.getElementById("customId").value;
  if (!id) return;
  return deleteCustomById(id);
}

async function deleteCustomById(id) {
  if (!roleAtLeast("super")) return toast("Solo super puede eliminar", "error");
  if (!confirm("¿Eliminar esta respuesta?")) return;
  try {
    const r = await fetch(`${CUSTOM_URL}/${id}`, {
      method: "DELETE",
      headers: { Authorization: "Bearer " + token },
    });
    const data = await r.json();
    if (!r.ok) throw new Error(data.error || "Error eliminando");
    toast("Eliminado", "success");
    await loadCustomReplies();
  } catch (e) {
    toast(e.message || "Error", "error");
  }
}

// =============================
// VIDEOS LIBRARY
// =============================
async function loadVideos(silent=false) {
  try {
    const r = await fetch(`${ADMIN_API}/videos`, { headers: { Authorization: "Bearer " + token }});
    videosCache = await r.json();
    fillVideoSelect(document.getElementById("videoSelect")?.value || "");
    renderVideosTable();
    if (!silent) toast("Videos cargados", "success");
    return videosCache;
  } catch (e) {
    console.error(e);
    if (!silent) toast("No se pudieron cargar videos", "error");
    videosCache = [];
    return [];
  }
}

function renderVideosTable() {
  const tbody = document.getElementById("videosTable");
  if (!tbody) return;
  tbody.innerHTML = "";
  videosCache.forEach(v => {
    const tr = document.createElement("tr");
    const delBtn = roleAtLeast("super") ? `<button class="btn danger" onclick="deleteVideo('${v._id}')">🗑️</button>` : "";
    tr.innerHTML = `
      <td>${escapeHtml(v.originalName || v.filename)}</td>
      <td>${new Date(v.createdAt).toLocaleString()}</td>
      <td>
        <button class="btn" onclick="previewVideo('${v._id}')">👁️</button>
        ${delBtn}
      </td>
    `;
    tbody.appendChild(tr);
  });

  // disable upload if no permission
  const file = document.getElementById("videoFile");
  const upBtn = document.querySelector("#videos .btn.primary");
  if (file) file.disabled = !roleAtLeast("editor");
  if (upBtn) upBtn.style.display = roleAtLeast("editor") ? "inline-block" : "none";
}

function previewVideo(id) {
  const v = videosCache.find(x => x._id === id);
  const box = document.getElementById("videoLibraryPreview");
  if (!box || !v) return;
  box.innerHTML = `<div class="hint"><b>${escapeHtml(v.originalName)}</b></div>
    <video src="${v.url}" controls style="width:100%;max-height:380px;border-radius:10px"></video>`;
}

async function uploadVideo() {
  if (!roleAtLeast("editor")) return toast("Sin permiso para subir", "error");
  const fileInput = document.getElementById("videoFile");
  const file = fileInput?.files?.[0];
  if (!file) return toast("Selecciona un video", "error");

  const fd = new FormData();
  fd.append("video", file);

  try {
    const r = await fetch(`${ADMIN_API}/videos`, {
      method: "POST",
      headers: { Authorization: "Bearer " + token },
      body: fd,
    });
    const data = await r.json();
    if (!r.ok) throw new Error(data.error || "Error subiendo");

    toast("Video subido", "success");
    fileInput.value = "";
    await loadVideos(true);
    await loadCustomReplies(); // refresca selector
  } catch (e) {
    console.error(e);
    toast(e.message || "Error", "error");
  }
}

async function deleteVideo(id) {
  if (!roleAtLeast("super")) return toast("Solo super puede eliminar", "error");
  if (!confirm("¿Eliminar este video?")) return;
  try {
    const r = await fetch(`${ADMIN_API}/videos/${id}`, {
      method: "DELETE",
      headers: { Authorization: "Bearer " + token },
    });
    const data = await r.json();
    if (!r.ok) throw new Error(data.error || "Error eliminando");

    toast("Video eliminado", "success");
    await loadVideos(true);
    await loadCustomReplies();
  } catch (e) {
    toast(e.message || "Error", "error");
  }
}

// util
function escapeHtml(str="") {
  return String(str)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}
