import { apiFetch, API } from "./api.js";
import { $, toast, fmtDate, escapeHtml } from "./ui.js";

let map = null;
let markers = [];

function ensureMap(){
  const el = document.getElementById("map");
  if (!el) return null;
  if (map) return map;
  map = L.map("map").setView([23.6345, -102.5528], 5); // MX
  L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", { maxZoom: 18 }).addTo(map);
  return map;
}

function clearMarkers(){
  markers.forEach(m => m.remove());
  markers = [];
}

export async function loadIps(){
  const rows = await apiFetch(`${API.admin}/ips`);
  const tbody = $("ipTable");
  tbody.innerHTML = (rows||[]).map(r=>`
    <tr>
      <td>${escapeHtml(r.ip||"")}</td>
      <td>${escapeHtml(String(r.total||r.count||0))}</td>
      <td>${escapeHtml(fmtDate(r.lastSeen||r.updatedAt||r.createdAt))}</td>
      <td>${escapeHtml(r.city||"")}</td>
      <td>${escapeHtml(r.country||"")}</td>
      <td>
        <button class="btn" data-history="${escapeHtml(r.ip||"")}">Ver historial</button>
      </td>
    </tr>
  `).join("");

  tbody.querySelectorAll("button[data-history]").forEach(b=>{
    b.addEventListener("click", ()=>{
      const ip = b.getAttribute("data-history");
      document.querySelector('#navbar button[data-tab="ipHistory"]').click();
      $("ipSearch").value = ip;
      document.getElementById("btnSearchIpHistory").click();
    });
  });

  // Map
  const m = ensureMap();
  if (m){
    clearMarkers();
    (rows||[]).forEach(r=>{
      if (typeof r.lat === "number" && typeof r.lon === "number"){
        const marker = L.marker([r.lat, r.lon]).addTo(m).bindPopup(`${escapeHtml(r.ip)}<br>${escapeHtml(r.city||"")} ${escapeHtml(r.country||"")}`);
        markers.push(marker);
      }
    });
  }
}

export async function loadIpHistory(){
  const ip = $("ipSearch").value.trim();
  if (!ip) throw new Error("Ingresa una IP");
  const rows = await apiFetch(`${API.admin}/messages/ip/${encodeURIComponent(ip)}`);
  const box = $("ipHistoryBox");
  box.innerHTML = `
    <div class="small"><b>IP:</b> ${escapeHtml(ip)} · <b>Mensajes:</b> ${rows?.length||0}</div>
    <div style="height:10px"></div>
    <table>
      <thead><tr><th>Rol</th><th>Mensaje</th><th>Fecha</th></tr></thead>
      <tbody>
        ${(rows||[]).slice(0,500).map(r=>`
          <tr>
            <td>${escapeHtml(r.role||"")}</td>
            <td>${escapeHtml(r.text||r.message||"")}</td>
            <td>${escapeHtml(fmtDate(r.createdAt))}</td>
          </tr>
        `).join("")}
      </tbody>
    </table>
  `;
}

export function bindIps(){
  $("btnReloadIps")?.addEventListener("click", ()=> loadIps().catch(e=>toast(e.message)));
  $("btnSearchIpHistory")?.addEventListener("click", ()=> loadIpHistory().catch(e=>toast(e.message)));
}
