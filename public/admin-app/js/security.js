import { apiFetch, API } from "./api.js";
import { $, toast, fmtDate, escapeHtml } from "./ui.js";

export async function loadBlocked(){
  const rows = await apiFetch(`${API.admin}/blocked-ips`);
  const tbody = $("blockedIPsTable");
  tbody.innerHTML = (rows||[]).map(r=>`
    <tr>
      <td>${escapeHtml(r.ip||"")}</td>
      <td><span class="pill ${r.active===false?'off':'ok'}">${r.active===false?'OFF':'ON'}</span></td>
      <td>${escapeHtml(r.reason||"")}</td>
      <td>${escapeHtml(fmtDate(r.createdAt))}</td>
      <td><button class="btn" data-unblock="${escapeHtml(r.ip)}">Desbloquear</button></td>
    </tr>
  `).join("");
  tbody.querySelectorAll("button[data-unblock]").forEach(b=>{
    b.addEventListener("click", async ()=>{
      const ip = b.getAttribute("data-unblock");
      await apiFetch(`${API.admin}/unblock-ip`, { method:"POST", body:{ ip }});
      toast("✅ IP desbloqueada");
      await loadBlocked();
    });
  });
}

export async function blockIp(){
  const ip = $("blockIpValue").value.trim();
  const reason = $("blockIpReason").value.trim();
  if (!ip) throw new Error("Falta IP");
  await apiFetch(`${API.admin}/block-ip`, { method:"POST", body:{ ip, reason }});
  toast("⛔ IP bloqueada");
  $("blockIpValue").value=""; $("blockIpReason").value="";
  await loadBlocked();
}

export async function loadSettings(){
  const s = await apiFetch(`${API.admin}/settings`);
  $("aiLimitPerIp").value = s?.aiLimitPerIp ?? 0;
}

export async function saveAiLimit(){
  const aiLimitPerIp = Number($("aiLimitPerIp").value || 0);
  await apiFetch(`${API.admin}/settings`, { method:"PUT", body:{ aiLimitPerIp }});
  toast("✅ Config guardada");
}

export function bindSecurity(){
  $("btnBlockIp")?.addEventListener("click", ()=> blockIp().catch(e=>toast(e.message)));
  $("btnSaveAiLimit")?.addEventListener("click", ()=> saveAiLimit().catch(e=>toast(e.message)));
}
