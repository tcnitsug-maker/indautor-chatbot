import { apiFetch, API } from "./api.js";
import { $, toast } from "./ui.js";

let trafficChart = null;

export async function loadDashboard(){
  // totals: use /admin/messages and /admin/ips for now
  const [msgs, ips] = await Promise.all([
    apiFetch(`${API.admin}/messages`),
    apiFetch(`${API.admin}/ips`),
  ]);

  $("totalMessages").textContent = String(msgs?.length || 0);
  $("totalIPs").textContent = String(ips?.length || 0);

  const today0 = new Date(); today0.setHours(0,0,0,0);
  const todayCount = (msgs||[]).filter(m => new Date(m.createdAt) >= today0).length;
  $("todayMessages").textContent = String(todayCount);

  await loadTraffic();
}

export async function loadTraffic(){
  const days = Number($("trafficRange")?.value || 7);
  // metrics/range expects start/end ? let's call /metrics/range?days=7 (support if implemented)
  let data;
  try{
    data = await apiFetch(`${API.metrics}/range?days=${days}`);
  }catch(e){
    // fallback: /metrics?days=...
    data = await apiFetch(`${API.metrics}/?days=${days}`);
  }
  // expected {labels:[], counts:[]} or array
  const labels = data?.labels || data?.days || data?.map?.(x=>x.label) || [];
  const counts = data?.counts || data?.values || data?.map?.(x=>x.count) || [];

  const ctx = document.getElementById("trafficChart");
  if (!ctx) return;

  if (trafficChart) { trafficChart.destroy(); trafficChart = null; }

  trafficChart = new Chart(ctx, {
    type: "line",
    data: { labels, datasets: [{ label: "Mensajes", data: counts, tension: 0.35 }] },
    options: { responsive:true, plugins:{ legend:{ display:true } }, scales:{ y:{ beginAtZero:true } } }
  });
}

export function bindDashboard(){
  $("btnReloadTraffic")?.addEventListener("click", ()=> loadTraffic().catch(e=>toast(e.message)));
  $("trafficRange")?.addEventListener("change", ()=> loadTraffic().catch(e=>toast(e.message)));
}
