export const API = {
  adminAuth: "/admin-auth",
  admin: "/admin",
  metrics: "/metrics",
};

const LS_TOKEN = "indarelin_admin_token";
const LS_USER = "indarelin_admin_user";

export function getToken(){ return localStorage.getItem(LS_TOKEN) || ""; }
export function setSession({token, user}){
  localStorage.setItem(LS_TOKEN, token);
  localStorage.setItem(LS_USER, JSON.stringify(user || {}));
}
export function clearSession(){
  localStorage.removeItem(LS_TOKEN);
  localStorage.removeItem(LS_USER);
}
export function getSessionUser(){
  try { return JSON.parse(localStorage.getItem(LS_USER) || "{}"); } catch { return {}; }
}

export async function apiFetch(path, { method="GET", headers={}, body=null, raw=false } = {}){
  const token = getToken();
  const h = { ...headers };
  if (token) h["Authorization"] = `Bearer ${token}`;
  if (body && !(body instanceof FormData) && !h["Content-Type"]) h["Content-Type"]="application/json";

  const res = await fetch(path, {
    method,
    headers: h,
    body: body instanceof FormData ? body : (body ? JSON.stringify(body) : null),
  });

  if (raw) return res;

  let data = null;
  const ct = res.headers.get("content-type") || "";
  if (ct.includes("application/json")) data = await res.json().catch(()=>null);
  else data = await res.text().catch(()=>null);

  if (!res.ok) {
    const msg = (data && data.error) ? data.error : (typeof data === "string" ? data : `HTTP ${res.status}`);
    throw new Error(msg);
  }
  return data;
}
