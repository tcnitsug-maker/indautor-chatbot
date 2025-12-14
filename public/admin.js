/* global AdminUI */
const AdminUI = (() => {
  const API_BASE = window.location.origin;
  const API = API_BASE + "/admin";
  const KEY = "indarelin_admin_token";

  function getToken(){ return localStorage.getItem(KEY) || ""; }
  function setToken(t){ localStorage.setItem(KEY, t); }
  function clearToken(){ localStorage.removeItem(KEY); }

  async function apiFetch(path, opts = {}) {
    const headers = Object.assign({ "Content-Type": "application/json" }, opts.headers || {});
    const t = getToken();
    if (t) headers["Authorization"] = "Bearer " + t;
    const res = await fetch(API + path, Object.assign({}, opts, { headers }));
    const isJson = (res.headers.get("content-type") || "").includes("application/json");
    const body = isJson ? await res.json().catch(()=>null) : await res.text().catch(()=>null);
    if (!res.ok) {
      const msg = (body && body.error) ? body.error : ("HTTP " + res.status);
      throw new Error(msg);
    }
    return body;
  }

  function show(el, msg){
    if (!el) return;
    el.textContent = msg;
    el.classList.remove("hidden");
  }
  function hide(el){ if (el) el.classList.add("hidden"); }

  // -------- LOGIN --------
  function mountLogin(){
    const btnLogin = document.getElementById("btnLogin");
    const btnLogout = document.getElementById("btnLogout");
    const msg = document.getElementById("msg");
    const u = document.getElementById("username");
    const p = document.getElementById("password");

    // if token exists, go dashboard
    if (getToken()) window.location.href = "./dashboard.html";

    btnLogout?.addEventListener("click", () => {
      clearToken();
      show(msg, "Sesión borrada.");
    });

    btnLogin?.addEventListener("click", async () => {
      hide(msg);
      const username = (u.value || "").trim();
      const password = (p.value || "").trim();
      if (!username || !password) return show(msg, "Faltan usuario o contraseña.");

      try{
        // login endpoint expected: POST /admin/login {username, password}
        const r = await fetch(API + "/login", {
          method:"POST",
          headers:{ "Content-Type":"application/json" },
          body: JSON.stringify({ username, password })
        });
        const data = await r.json().catch(()=>null);
        if (!r.ok || !data) throw new Error((data && data.error) ? data.error : "No se pudo iniciar sesión");
        // accept token fields
        const token = data.token || data.jwt || data.access_token || "";
        if (!token) throw new Error("Login OK pero no llegó token. Revisa /admin/login.");
        setToken(token);
        window.location.href = "./dashboard.html";
      }catch(e){
        show(msg, e.message);
      }
    });
  }

  // -------- DASHBOARD --------
  function switchView(view){
    document.querySelectorAll(".navbtn").forEach(b => b.classList.toggle("active", b.dataset.view === view));
    document.querySelectorAll("main section[id^='view-']").forEach(sec => sec.classList.add("hidden"));
    const v = document.getElementById("view-" + view);
    if (v) v.classList.remove("hidden");
  }

  function fmt(n){
    if (n === null || n === undefined) return "—";
    try { return new Intl.NumberFormat("es-MX").format(n); } catch { return String(n); }
  }

  function badgeActive(active){
    return active ? '<span class="badge danger">Bloqueada</span>' : '<span class="badge ok">Desbloqueada</span>';
  }

  async function loadWho(){
    // Try /profile, fallback to token existence
    try{
      const u = await apiFetch("/profile");
      const who = document.getElementById("who");
      if (who) who.textContent = `${u.username} · ${u.role}`;
      // Hide Add User if not super
      if (u.role !== "super") {
        const btn = document.getElementById("btnAddUser");
        if (btn) btn.classList.add("hidden");
      }
    }catch{
      const who = document.getElementById("who");
      if (who) who.textContent = "Sesión activa";
    }
  }

  async function loadMetrics(){
    const cards = document.getElementById("cards");
    cards.innerHTML = "";
    const data = await apiFetch("/metrics/summary");
    const items = [
      { k:"Total mensajes", v: fmt(data.totalMessages) },
      { k:"Mensajes hoy", v: fmt(data.messagesToday) },
      { k:"IPs únicas", v: fmt(data.uniqueIPs) },
      { k:"IPs bloqueadas", v: fmt(data.blockedIPsActive) },
      { k:"Custom total", v: fmt(data.customRepliesTotal) },
      { k:"Custom habilitadas", v: fmt(data.customRepliesEnabled) },
    ];
    for (const it of items){
      const div = document.createElement("div");
      div.className = "card";
      div.innerHTML = `<h3>${it.k}</h3><div class="big">${it.v}</div>`;
      cards.appendChild(div);
    }

    // Top tables
    const topIpsTable = document.getElementById("topIpsTable");
    topIpsTable.innerHTML = "<thead><tr><th>IP</th><th>Total</th></tr></thead><tbody>" +
      (data.topIps || []).map(r => `<tr><td>${r._id}</td><td>${fmt(r.total)}</td></tr>`).join("") +
      "</tbody>";

    const topTextsTable = document.getElementById("topTextsTable");
    topTextsTable.innerHTML = "<thead><tr><th>Texto</th><th>Total</th></tr></thead><tbody>" +
      (data.topTexts || []).map(r => `<tr><td>${(r._id || "").toString().slice(0,120)}</td><td>${fmt(r.total)}</td></tr>`).join("") +
      "</tbody>";
  }

  async function loadMessages(){
    const tbl = document.getElementById("messagesTable");
    tbl.innerHTML = "<thead><tr><th>Fecha</th><th>IP</th><th>Rol</th><th>Texto</th></tr></thead><tbody><tr><td colspan='4'>Cargando…</td></tr></tbody>";
    const rows = await apiFetch("/messages");
    const top = (rows || []).slice(0, 100);
    tbl.innerHTML = "<thead><tr><th>Fecha</th><th>IP</th><th>Rol</th><th>Texto</th></tr></thead><tbody>" +
      top.map(r => `<tr><td>${new Date(r.createdAt).toLocaleString()}</td><td>${r.ip||""}</td><td>${r.role||""}</td><td>${(r.text||"").toString().slice(0,220)}</td></tr>`).join("") +
      "</tbody>";
  }

  async function loadReplies(){
    const tbl = document.getElementById("repliesTable");
    tbl.innerHTML = "<thead><tr><th>Trigger</th><th>Respuesta</th><th>Prioridad</th><th>Activo</th></tr></thead><tbody><tr><td colspan='4'>Cargando…</td></tr></tbody>";
    const rows = await apiFetch("/custom-replies");
    tbl.innerHTML = "<thead><tr><th>Trigger</th><th>Respuesta</th><th>Prioridad</th><th>Activo</th></tr></thead><tbody>" +
      (rows||[]).slice(0,200).map(r => `<tr>
        <td>${(r.trigger||r.question||"").toString().slice(0,80)}</td>
        <td>${(r.response||r.answer||"").toString().slice(0,160)}</td>
        <td>${fmt(r.priority ?? 1)}</td>
        <td>${r.enabled ? '<span class="badge ok">Sí</span>' : '<span class="badge warn">No</span>'}</td>
      </tr>`).join("") +
      "</tbody>";
  }

  async function loadUsers(){
    const tbl = document.getElementById("usersTable");
    tbl.innerHTML = "<thead><tr><th>Usuario</th><th>Rol</th><th>Activo</th><th>Acciones</th></tr></thead><tbody><tr><td colspan='4'>Cargando…</td></tr></tbody>";
    const rows = await apiFetch("/users");
    tbl.innerHTML = "<thead><tr><th>Usuario</th><th>Rol</th><th>Activo</th><th>Acciones</th></tr></thead><tbody>" +
      (rows||[]).map(u => `<tr>
        <td>${u.username}</td>
        <td>${u.role}</td>
        <td>${u.active ? '<span class="badge ok">Activo</span>' : '<span class="badge warn">Inactivo</span>'}</td>
        <td>
          <button class="btn small" data-act="toggle" data-id="${u._id}" data-active="${u.active}">${u.active ? "Desactivar" : "Activar"}</button>
          <button class="btn small" data-act="role" data-id="${u._id}">Cambiar rol</button>
          <button class="btn small" data-act="pass" data-id="${u._id}">Reset pass</button>
        </td>
      </tr>`).join("") +
      "</tbody>";

    tbl.querySelectorAll("button[data-act]").forEach(btn => {
      btn.addEventListener("click", async () => {
        const id = btn.dataset.id;
        const act = btn.dataset.act;
        try{
          if (act === "toggle"){
            const active = btn.dataset.active === "true";
            await apiFetch("/users/" + id, { method:"PUT", body: JSON.stringify({ active: !active })});
            await loadUsers();
          } else if (act === "role") {
            const role = prompt("Nuevo rol: support / analyst / editor / super");
            if (!role) return;
            await apiFetch("/users/" + id, { method:"PUT", body: JSON.stringify({ role })});
            await loadUsers();
          } else if (act === "pass") {
            const newPassword = prompt("Nueva contraseña (min 6):");
            if (!newPassword) return;
            await apiFetch("/users/" + id + "/password", { method:"PUT", body: JSON.stringify({ newPassword })});
            alert("Contraseña actualizada.");
          }
        }catch(e){
          alert(e.message);
        }
      });
    });
  }

  async function loadIPs(){
    const tbl = document.getElementById("ipsTable");
    tbl.innerHTML = "<thead><tr><th>IP</th><th>Estado</th><th>Motivo</th><th>Actualizado</th><th>Acción</th></tr></thead><tbody><tr><td colspan='5'>Cargando…</td></tr></tbody>";
    const rows = await apiFetch("/blocked-ips");
    tbl.innerHTML = "<thead><tr><th>IP</th><th>Estado</th><th>Motivo</th><th>Actualizado</th><th>Acción</th></tr></thead><tbody>" +
      (rows||[]).map(r => `<tr>
        <td>${r.ip}</td>
        <td>${badgeActive(!!r.active)}</td>
        <td>${(r.reason||"")}</td>
        <td>${r.updatedAt ? new Date(r.updatedAt).toLocaleString() : ""}</td>
        <td>
          ${r.active
            ? `<button class="btn small" data-act="unblock" data-ip="${r.ip}">Desbloquear</button>`
            : `<button class="btn small" data-act="block" data-ip="${r.ip}">Bloquear</button>`}
        </td>
      </tr>`).join("") +
      "</tbody>";

    tbl.querySelectorAll("button[data-act]").forEach(btn => {
      btn.addEventListener("click", async () => {
        const ip = btn.dataset.ip;
        const act = btn.dataset.act;
        try{
          if (act === "unblock") await apiFetch("/unblock-ip", { method:"POST", body: JSON.stringify({ ip })});
          if (act === "block") await apiFetch("/block-ip", { method:"POST", body: JSON.stringify({ ip })});
          await loadIPs();
        }catch(e){ alert(e.message); }
      });
    });
  }

  async function loadSettings(){
    const msg = document.getElementById("settingsMsg");
    hide(msg);
    const data = await apiFetch("/settings");
    document.getElementById("aiLimit").value = (data.ai_daily_limit_per_ip ?? "");
  }

  function download(urlPath){
    const t = getToken();
    const url = API + urlPath;
    // add token via header by using fetch -> blob
    return fetch(url, { headers: { Authorization: "Bearer " + t }})
      .then(r => {
        if (!r.ok) throw new Error("No se pudo descargar");
        return r.blob();
      })
      .then(blob => {
        const a = document.createElement("a");
        const u = URL.createObjectURL(blob);
        a.href = u;
        const name = urlPath.split("filename=").pop() || "descarga";
        a.download = (urlPath.includes("mensajes.xlsx")) ? "mensajes.xlsx" : "";
        a.click();
        setTimeout(()=>URL.revokeObjectURL(u), 3000);
      });
  }

  function mountDashboard(){
    // nav
    document.querySelectorAll(".navbtn").forEach(b => {
      b.addEventListener("click", () => switchView(b.dataset.view));
    });

    document.getElementById("btnLogout").addEventListener("click", () => {
      clearToken();
      window.location.href = "./index.html";
    });
    document.getElementById("btnGoLogin").addEventListener("click", () => window.location.href = "./index.html");

    // buttons
    document.getElementById("btnRefreshDash").addEventListener("click", () => loadMetrics().catch(e=>alert(e.message)));
    document.getElementById("btnRefreshMessages").addEventListener("click", () => loadMessages().catch(e=>alert(e.message)));
    document.getElementById("btnRefreshReplies").addEventListener("click", () => loadReplies().catch(e=>alert(e.message)));
    document.getElementById("btnRefreshUsers").addEventListener("click", () => loadUsers().catch(e=>alert(e.message)));
    document.getElementById("btnRefreshIPs").addEventListener("click", () => loadIPs().catch(e=>alert(e.message)));
    document.getElementById("btnRefreshSettings").addEventListener("click", () => loadSettings().catch(e=>alert(e.message)));

    // exports
    document.getElementById("btnExportMsgs").addEventListener("click", () => download("/messages/export-xlsx").catch(e=>alert(e.message)));
    document.getElementById("btnExportMsgs2").addEventListener("click", () => download("/messages/export-xlsx").catch(e=>alert(e.message)));
    document.getElementById("btnExportUsers").addEventListener("click", () => download("/users/export-xlsx").catch(e=>alert(e.message)));
    document.getElementById("btnExportIPs").addEventListener("click", () => download("/blocked-ips/export-xlsx").catch(e=>alert(e.message)));
    document.getElementById("btnExportMetrics").addEventListener("click", () => download("/metrics/export-xlsx").catch(e=>alert(e.message)));

    document.getElementById("btnTemplate").addEventListener("click", () => download("/custom-replies/template-xlsx").catch(e=>alert(e.message)));
    document.getElementById("btnExportRepliesCSV").addEventListener("click", () => download("/custom-replies/export-csv").catch(e=>alert(e.message)));
    document.getElementById("btnExportRepliesPDF").addEventListener("click", () => download("/custom-replies/export-pdf").catch(e=>alert(e.message)));

    // add user
    const addCard = document.getElementById("addUserCard");
    document.getElementById("btnAddUser").addEventListener("click", () => addCard.classList.toggle("hidden"));
    document.getElementById("btnCreateUser").addEventListener("click", async () => {
      const userMsg = document.getElementById("userMsg");
      hide(userMsg);
      try{
        const username = document.getElementById("newUser").value.trim();
        const password = document.getElementById("newPass").value.trim();
        const role = document.getElementById("newRole").value;
        const active = document.getElementById("newActive").value === "true";
        if (!username || !password) return show(userMsg, "Faltan datos.");
        await apiFetch("/users", { method:"POST", body: JSON.stringify({ username, password, role, active })});
        show(userMsg, "Usuario creado.");
        await loadUsers();
      }catch(e){ show(document.getElementById("userMsg"), e.message); }
    });

    // block IP
    document.getElementById("btnBlockIP").addEventListener("click", async () => {
      const ipMsg = document.getElementById("ipMsg");
      hide(ipMsg);
      try{
        const ip = document.getElementById("ipToBlock").value.trim();
        const reason = document.getElementById("ipReason").value.trim();
        if (!ip) return show(ipMsg, "Falta IP.");
        await apiFetch("/block-ip", { method:"POST", body: JSON.stringify({ ip, reason })});
        show(ipMsg, "IP bloqueada.");
        await loadIPs();
      }catch(e){ show(ipMsg, e.message); }
    });

    // import excel
    document.getElementById("btnImportExcel").addEventListener("click", async () => {
      const importMsg = document.getElementById("importMsg");
      hide(importMsg);
      const f = document.getElementById("fileExcel").files[0];
      if (!f) return show(importMsg, "Selecciona un archivo.");
      const fd = new FormData();
      fd.append("file", f);
      try{
        const t = getToken();
        const r = await fetch(API + "/custom-replies/import-excel", {
          method:"POST",
          headers:{ "Authorization": "Bearer " + t },
          body: fd
        });
        const data = await r.json().catch(()=>null);
        if (!r.ok) throw new Error((data && data.error) ? data.error : "No se pudo importar");
        show(importMsg, `Importado. Creados: ${data.created}, Actualizados: ${data.updated}, Omitidos: ${data.skipped}`);
        await loadReplies();
      }catch(e){ show(importMsg, e.message); }
    });

    // save limit
    document.getElementById("btnSaveAiLimit").addEventListener("click", async () => {
      const settingsMsg = document.getElementById("settingsMsg");
      hide(settingsMsg);
      try{
        const v = parseInt(document.getElementById("aiLimit").value, 10);
        await apiFetch("/settings/ai-limit", { method:"PUT", body: JSON.stringify({ ai_daily_limit_per_ip: v })});
        show(settingsMsg, "Guardado.");
      }catch(e){ show(settingsMsg, e.message); }
    });

    // initial load
    if (!getToken()) return window.location.href = "./index.html";
    loadWho();
    loadMetrics().catch(e=>alert(e.message));
    loadMessages().catch(()=>{});
    loadReplies().catch(()=>{});
    loadUsers().catch(()=>{});
    loadIPs().catch(()=>{});
    loadSettings().catch(()=>{});
  }

  return { mountLogin, mountDashboard };
})();
window.AdminUI = AdminUI;
