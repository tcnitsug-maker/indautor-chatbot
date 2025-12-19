import { $, toast, setActiveTab } from "./ui.js";
import { apiFetch, API, getToken, setSession, clearSession, getSessionUser } from "./api.js";

import { bindDashboard, loadDashboard, loadTraffic } from "./dashboard.js";
import { bindMessages, loadMessages } from "./messages.js";
import { bindCustom, loadCustom, loadVideosIntoSelect, onTypeChange } from "./custom.js";
import { bindVideos, loadVideos } from "./videos.js";
import { bindUsers, loadUsers } from "./users.js";
import { bindSecurity, loadBlocked, loadSettings } from "./security.js";
import { bindProfile, loadProfile, changeMyPassword } from "./profile.js";
import { bindIps, loadIps, loadIpHistory } from "./ips.js";

function showLogin(show){
  $("loginOverlay").classList.toggle("hidden", !show);
}

async function login(){
  const username = $("loginUser").value.trim();
  const password = $("loginPass").value;
  $("loginError").textContent = "";
  if (!username || !password) { $("loginError").textContent = "Faltan credenciales"; return; }
  try{
    const data = await apiFetch(`${API.adminAuth}/login`, { method:"POST", body:{ username, password }});
    setSession({ token: data.token, user: { username: data.username || username, role: data.role || data.user?.role } });
    toast("✅ Sesión iniciada");
    showLogin(false);
    await bootstrap();
  }catch(e){
    $("loginError").textContent = e.message;
  }
}

function logout(){
  clearSession();
  toast("Sesión cerrada");
  showLogin(true);
  $("whoUser").textContent = "—";
  $("whoRole").textContent = "—";
}

async function hydrateHeader(){
  // Prefer real profile
  try{
    const me = await apiFetch(`${API.admin}/profile`);
    $("whoUser").textContent = me.username || "—";
    $("whoRole").textContent = me.role || "—";
  }catch{
    const u = getSessionUser();
    $("whoUser").textContent = u.username || "—";
    $("whoRole").textContent = u.role || "—";
  }
}

async function bootstrap(){
  // verify token with /admin/profile
  try{
    await hydrateHeader();
  }catch(e){
    showLogin(true);
    return;
  }

  // bind events
  bindDashboard();
  bindIps();
  bindMessages();
  bindCustom();
  bindVideos();
  bindUsers();
  bindSecurity();
  bindProfile();

  // tabs
  document.querySelectorAll("#navbar button[data-tab]").forEach(btn=>{
    btn.addEventListener("click", async ()=>{
      const tab = btn.getAttribute("data-tab");
      setActiveTab(tab);
      try{
        if (tab === "dashboard") await loadDashboard();
        if (tab === "ips") await loadIps();
        if (tab === "ipHistory") {} // user triggers search
        if (tab === "messages") await loadMessages();
        if (tab === "custom") { await loadVideosIntoSelect(); onTypeChange(); await loadCustom(); }
        if (tab === "videos") await loadVideos();
        if (tab === "users") await loadUsers();
        if (tab === "security") { await loadBlocked(); await loadSettings(); }
        if (tab === "profile") await loadProfile();
      }catch(e){
        toast(e.message);
      }
    });
  });

  // initial loads
  setActiveTab("dashboard");
  await loadDashboard();
}

function wireGlobal(){
  $("btnLogin")?.addEventListener("click", login);
  $("btnClearSession")?.addEventListener("click", ()=>{ clearSession(); $("loginError").textContent="Sesión limpiada"; });
  $("btnLogout")?.addEventListener("click", logout);

  // enter key in login
  ["loginUser","loginPass"].forEach(id=>{
    $(id)?.addEventListener("keydown",(e)=>{ if(e.key==="Enter") login(); });
  });
}

(async function init(){
  wireGlobal();
  const token = getToken();
  if (!token){
    showLogin(true);
    return;
  }
  try{
    // quick token verify
    await apiFetch(`${API.admin}/profile`);
    showLogin(false);
    await bootstrap();
  }catch(e){
    showLogin(true);
  }
})();
