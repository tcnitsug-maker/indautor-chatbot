// =====================================================
// AUTH
// =====================================================
const token = localStorage.getItem("token");
if (!token) location.href = "/admin-login.html";

function parseJwt(t) {
  try {
    const b = t.split(".")[1].replace(/-/g, "+").replace(/_/g, "/");
    return JSON.parse(decodeURIComponent(atob(b).split("").map(c => "%" + c.charCodeAt(0).toString(16).padStart(2,"0")).join("")));
  } catch { return {}; }
}

const me = parseJwt(token);
const ROLE = (me.role || "support").toLowerCase();
const API = "/admin";

// =====================================================
// HELPERS
// =====================================================
const ROLE_ORDER = ["support","analyst","editor","super"];
const can = r => ROLE_ORDER.indexOf(ROLE) >= ROLE_ORDER.indexOf(r);

function authHeaders(json=true){
  const h = { Authorization: "Bearer " + token };
  if (json) h["Content-Type"] = "application/json";
  return h;
}

function esc(s=""){
  return String(s)
    .replaceAll("&","&amp;")
    .replaceAll("<","&lt;")
    .replaceAll(">","&gt;")
    .replaceAll('"',"&quot;")
    .replaceAll("'","&#039;");
}

async function api(url, opts={}){
  opts.headers = { ...(opts.headers||{}), ...authHeaders(!!opts.body) };
  const r = await fetch(url, opts);
  const j = await r.json().catch(()=>({}));
  if(!r.ok) throw new Error(j.error || "Error");
  return j;
}

// =====================================================
// NAV
// =====================================================
function setTab(id){
  document.querySelectorAll(".tab-content").forEach(s=>s.classList.toggle("active", s.id===id));
  document.querySelectorAll("#navbar button").forEach(b=>b.classList.toggle("active", b.dataset.tab===id));
  ({
    dashboard:loadDashboard,
    ips:loadIPs,
    messages:loadMessages,
    custom:loadCustom,
    videos:loadVideos,
    users:loadUsers,
    profile:loadProfile
  }[id]||(()=>{}))();
}

document.addEventListener("DOMContentLoaded",()=>{
  whoUser.textContent = me.username || "admin";
  whoRole.textContent = ROLE;
  document.querySelectorAll("#navbar button").forEach(b=>b.onclick=()=>setTab(b.dataset.tab));
  setTab("dashboard");
});

// =====================================================
// DASHBOARD
// =====================================================
async function loadDashboard(){
  const d = await api(`${API}/metrics`);
  totalMessages.textContent = d.totalMessages;
  totalIPs.textContent = d.totalIPs;
  todayMessages.textContent = d.todayMessages;

  if (window.trafficChart) window.trafficChart.destroy();
  trafficChart = new Chart(trafficChart?.ctx||document.getElementById("trafficChart"),{
    type:"line",
    data:{ labels:d.chart.labels, datasets:[{label:"Mensajes",data:d.chart.values}] }
  });
}

// =====================================================
// IPS
// =====================================================
let map, markers=[];
function initMap(){
  if(map) return;
  map=L.map("map").setView([23.6,-102.5],5);
  L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png").addTo(map);
}
async function loadIPs(){
  initMap(); markers.forEach(m=>m.remove()); markers=[];
  const ips = await api(`${API}/ips`);
  ipTable.innerHTML="";
  for(const i of ips){
    const tr=document.createElement("tr");
    tr.innerHTML=`
      <td>${i.ip}</td>
      <td>${i.count}</td>
      <td>${new Date(i.lastSeen).toLocaleString()}</td>
      <td>${i.city||"-"}</td>
      <td>${i.country||"-"}</td>
      <td><button onclick="viewIP('${i.ip}')">📜</button></td>`;
    ipTable.appendChild(tr);
    if(i.lat&&i.lng){
      const m=L.marker([i.lat,i.lng]).addTo(map); markers.push(m);
    }
  }
}

// =====================================================
// HISTORIAL
// =====================================================
async function loadMessages(){
  const rows=await api(`${API}/messages`);
  generalHistory.innerHTML=rows.map(r=>`
    <tr><td>${r.role}</td><td>${esc(r.text)}</td><td>${new Date(r.createdAt).toLocaleString()}</td></tr>`
  ).join("");
}

// =====================================================
// CUSTOM REPLIES (ALINEADO A SCHEMA FINAL)
// =====================================================
let customCache=[];
async function loadCustom(){
  customCache = await api(`${API}/custom-replies`);
  renderCustom(customCache);
  newCustom();
}

function renderCustom(list){
  customTable.innerHTML="";
  list.forEach(r=>{
    customTable.innerHTML+=`
      <tr>
        <td>${esc(r.trigger)}</td>
        <td>${r.type}</td>
        <td>${r.priority}</td>
        <td>${r.enabled?"ON":"OFF"}</td>
        <td><button onclick="editCustom('${r._id}')">✏️</button></td>
      </tr>`;
  });
}

function newCustom(){
  customId.value="";
  triggerInput.value="";
  responseInput.value="";
  priorityInput.value=10;
  typeInput.value="text";
  enabledInput.checked=true;
  videoUrlInput.value="";
  onTypeChange();
}

function editCustom(id){
  const r=customCache.find(x=>x._id===id);
  if(!r) return;
  customId.value=r._id;
  triggerInput.value=r.trigger;
  responseInput.value=r.response;
  priorityInput.value=r.priority;
  typeInput.value=r.type;
  enabledInput.checked=r.enabled;
  videoUrlInput.value=r.videoUrl||"";
  onTypeChange();
}

async function saveCustom(){
  if(!can("editor")) return alert("Sin permiso");
  const p={
    trigger:triggerInput.value.trim(),
    response:responseInput.value.trim(),
    priority:+priorityInput.value||1,
    type:typeInput.value,
    enabled:enabledInput.checked,
    videoUrl:typeInput.value==="video"?videoUrlInput.value.trim():null
  };
  if(!p.trigger||!p.response) return alert("Datos incompletos");
  const id=customId.value;
  await api(id?`${API}/custom-replies/${id}`:`${API}/custom-replies`,{
    method:id?"PUT":"POST", body:JSON.stringify(p)
  });
  loadCustom();
}

function onTypeChange(){
  videoBox.classList.toggle("hidden", typeInput.value!=="video");
}

// =====================================================
// VIDEOS
// =====================================================
async function loadVideos(){
  const v=await api(`${API}/videos`);
  videosTable.innerHTML=v.map(x=>`
    <tr>
      <td>${esc(x.originalName)}</td>
      <td>${new Date(x.createdAt).toLocaleString()}</td>
      <td><button onclick="previewVideo('${x.url}')">▶</button></td>
    </tr>`).join("");
}
function previewVideo(url){
  videoLibraryPreview.innerHTML=`<video src="${url}" controls style="width:100%"></video>`;
}

// =====================================================
// USERS
// =====================================================
async function loadUsers(){
  if(!can("super")){ usersTable.innerHTML="<tr><td>Sin permisos</td></tr>"; return; }
  const u=await api(`${API}/users`);
  usersTable.innerHTML=u.map(x=>`
    <tr>
      <td>${x.username}</td>
      <td>${x.role}</td>
      <td>${x.active?"ON":"OFF"}</td>
      <td>${new Date(x.createdAt).toLocaleString()}</td>
    </tr>`).join("");
}

// =====================================================
// PROFILE
// =====================================================
async function loadProfile(){
  const u=await api(`${API}/me`);
  profileBox.innerHTML=`
    <div><b>Usuario:</b> ${esc(u.username)}</div>
    <div><b>Rol:</b> ${esc(u.role)}</div>`;
}

function logout(){
  localStorage.removeItem("token");
  location.href="/admin-login.html";
}
// =============================
// DESCARGAR PLANTILLA EXCEL
// =============================
async function downloadCustomTemplate() {
  try {
    const r = await fetch("/admin/custom-replies/template-xlsx", {
      headers: {
        Authorization: "Bearer " + localStorage.token
      }
    });

    if (!r.ok) {
      throw new Error("No se pudo descargar la plantilla");
    }

    const blob = await r.blob();
    const url = window.URL.createObjectURL(blob);

    const a = document.createElement("a");
    a.href = url;
    a.download = "plantilla_respuestas.xlsx";
    document.body.appendChild(a);
    a.click();
    a.remove();

    window.URL.revokeObjectURL(url);
  } catch (e) {
    console.error(e);
    alert("Error descargando la plantilla Excel");
  }
}

