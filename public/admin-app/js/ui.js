export function $(id){ return document.getElementById(id); }

export function toast(msg){
  const el = $("toast");
  if (!el) return alert(msg);
  el.textContent = msg;
  el.classList.add("show");
  clearTimeout(el._t);
  el._t = setTimeout(()=> el.classList.remove("show"), 2400);
}

export function fmtDate(s){
  try{
    const d = new Date(s);
    return d.toLocaleString("es-MX", { year:"numeric", month:"2-digit", day:"2-digit", hour:"2-digit", minute:"2-digit" });
  }catch{ return String(s||""); }
}

export function escapeHtml(str=""){
  return String(str)
    .replaceAll("&","&amp;").replaceAll("<","&lt;")
    .replaceAll(">","&gt;").replaceAll('"',"&quot;")
    .replaceAll("'","&#039;");
}

export function setActiveTab(tabId){
  document.querySelectorAll(".tab-content").forEach(s=> s.classList.add("hidden"));
  const sec = document.getElementById(tabId);
  if (sec) sec.classList.remove("hidden");

  document.querySelectorAll("#navbar button").forEach(b=> b.classList.remove("active"));
  const btn = document.querySelector(`#navbar button[data-tab="${tabId}"]`);
  if (btn) btn.classList.add("active");
}
