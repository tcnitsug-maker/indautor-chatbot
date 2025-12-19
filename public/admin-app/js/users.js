import { apiFetch, API } from "./api.js";
import { $, toast, fmtDate, escapeHtml } from "./ui.js";

let all = [];

function pill(active){ return `<span class="pill ${active?'ok':'off'}">${active?'ON':'OFF'}</span>`; }

export async function loadUsers(){
  all = await apiFetch(`${API.admin}/users`);
  const tbody = $("usersTable");
  tbody.innerHTML = (all||[]).map(u=>`
    <tr>
      <td>${escapeHtml(u.username||"")}</td>
      <td>${escapeHtml(u.role||"")}</td>
      <td>${pill(u.active !== false)}</td>
      <td>${escapeHtml(fmtDate(u.createdAt))}</td>
      <td>${escapeHtml(fmtDate(u.updatedAt))}</td>
      <td>
        <button class="btn" data-edit="${escapeHtml(u._id)}">Editar</button>
        <button class="btn" data-pass="${escapeHtml(u._id)}">Pass</button>
      </td>
    </tr>
  `).join("");

  tbody.querySelectorAll("button[data-edit]").forEach(b=>{
    b.addEventListener("click", async ()=>{
      const id = b.getAttribute("data-edit");
      const u = (all||[]).find(x=>x._id===id);
      const role = prompt("Nuevo rol (support/analyst/editor/super):", u?.role||"support");
      if (!role) return;
      const active = confirm("¿Activo? (Aceptar=SI / Cancelar=NO)");
      await apiFetch(`${API.admin}/users/${id}`, { method:"PUT", body:{ role, active }});
      toast("✅ Usuario actualizado");
      await loadUsers();
    });
  });

  tbody.querySelectorAll("button[data-pass]").forEach(b=>{
    b.addEventListener("click", async ()=>{
      const id = b.getAttribute("data-pass");
      const p = prompt("Nueva contraseña (mín 6):");
      if (!p) return;
      await apiFetch(`${API.admin}/users/${id}/password`, { method:"PUT", body:{ newPassword:p }});
      toast("✅ Contraseña actualizada");
    });
  });
}

export async function createUser(){
  const username = $("newUsername").value.trim();
  const password = $("newPassword").value;
  const role = $("newRole").value;
  const active = $("newUserActive").checked;
  if (!username || !password) throw new Error("Faltan datos");
  await apiFetch(`${API.admin}/users`, { method:"POST", body:{ username, password, role, active }});
  toast("✅ Usuario creado");
  $("newUsername").value=""; $("newPassword").value="";
  await loadUsers();
}

export function bindUsers(){
  $("btnReloadUsers")?.addEventListener("click", ()=> loadUsers().catch(e=>toast(e.message)));
  $("btnCreateUser")?.addEventListener("click", ()=> createUser().catch(e=>toast(e.message)));
}
