import { apiFetch, API } from "./api.js";
import { $, toast, fmtDate, escapeHtml } from "./ui.js";

export async function loadMessages(){
  const rows = await apiFetch(`${API.admin}/messages`);
  const tbody = $("generalHistory");
  if (!tbody) return;
  tbody.innerHTML = (rows||[]).slice(0,500).map(r => `
    <tr>
      <td>${escapeHtml(r.ip||"")}</td>
      <td>${escapeHtml(r.role||"")}</td>
      <td>${escapeHtml(r.text||r.message||"")}</td>
      <td>${escapeHtml(fmtDate(r.createdAt||r.date))}</td>
    </tr>
  `).join("");
}

export function bindMessages(){
  $("btnReloadMessages")?.addEventListener("click", ()=> loadMessages().catch(e=>toast(e.message)));
  $("btnExportMessagesCsv")?.addEventListener("click", ()=> window.open(`${API.admin}/messages/export-csv`, "_blank"));
  $("btnExportMessagesXlsx")?.addEventListener("click", ()=> window.open(`${API.admin}/messages/export-xlsx`, "_blank"));
}
