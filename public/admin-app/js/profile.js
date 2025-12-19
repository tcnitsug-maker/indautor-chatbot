import { apiFetch, API } from "./api.js";
import { $, toast, escapeHtml, fmtDate } from "./ui.js";

export async function loadProfile(){
  const me = await apiFetch(`${API.admin}/profile`);
  $("profileBox").innerHTML = `
    <div><b>Usuario:</b> ${escapeHtml(me?.username||"")}</div>
    <div><b>Rol:</b> ${escapeHtml(me?.role||"")}</div>
    <div><b>Activo:</b> ${me?.active===false ? "NO" : "SI"}</div>
    <div><b>Creado:</b> ${escapeHtml(fmtDate(me?.createdAt))}</div>
  `;
}

export async function changeMyPassword(){
  const currentPassword = $("myCurrentPassword").value;
  const newPassword = $("myNewPassword").value;
  if (!currentPassword || !newPassword) throw new Error("Faltan datos");
  await apiFetch(`${API.admin}/profile/password`, { method:"PUT", body:{ currentPassword, newPassword }});
  toast("✅ Contraseña cambiada");
  $("myCurrentPassword").value=""; $("myNewPassword").value="";
}

export function bindProfile(){
  $("btnChangeMyPassword")?.addEventListener("click", ()=> changeMyPassword().catch(e=>toast(e.message)));
  $("btnReloadProfile")?.addEventListener("click", ()=> loadProfile().catch(e=>toast(e.message)));
}
