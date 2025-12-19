import { apiFetch, API } from "./api.js";
import { $, toast, escapeHtml } from "./ui.js";

let all = [];

function readForm(){
  return {
    trigger: $("triggerInput").value.trim(),
    response: $("responseInput").value.trim(),
    keywords: ($("keywordsInput").value || "").split(",").map(s=>s.trim()).filter(Boolean),
    priority: Number($("priorityInput").value || 10),
    type: $("typeInput").value,
    enabled: $("enabledInput").checked,
    videoId: $("videoSelect")?.value || "",
    videoUrl: $("videoUrlInput")?.value?.trim() || ""
  };
}

function fillForm(item){
  $("customId").value = item?._id || "";
  $("triggerInput").value = item?.trigger || "";
  $("responseInput").value = item?.response || "";
  $("keywordsInput").value = (item?.keywords || []).join(", ");
  $("priorityInput").value = item?.priority ?? 10;
  $("typeInput").value = item?.type || "text";
  $("enabledInput").checked = item?.enabled !== false;

  $("videoUrlInput").value = item?.videoUrl || "";
  if ($("videoSelect")) $("videoSelect").value = item?.videoId || "";
  onTypeChange();

  const del = $("btnDeleteCustom");
  if (del){
    del.classList.toggle("hidden", !item?._id);
  }
}

export function onTypeChange(){
  const isVideo = ($("typeInput").value === "video");
  $("videoBox").classList.toggle("hidden", !isVideo);
}

export async function loadVideosIntoSelect(){
  const vids = await apiFetch(`${API.admin}/videos`);
  const sel = $("videoSelect");
  if (!sel) return;
  sel.innerHTML = `<option value="">— Selecciona video —</option>` + (vids||[]).map(v => `<option value="${escapeHtml(v._id)}">${escapeHtml(v.originalName||v.filename||v._id)}</option>`).join("");
}

export async function loadCustom(){
  all = await apiFetch(`${API.admin}/custom-replies`);
  renderCustom();
}

function renderCustom(){
  const q = ($("customSearch").value || "").toLowerCase().trim();
  const rows = (all||[]).filter(r => !q || (r.trigger||"").toLowerCase().includes(q) || (r.response||"").toLowerCase().includes(q));
  const tbody = $("customTable");
  tbody.innerHTML = rows.slice(0,500).map(r => `
    <tr>
      <td>${escapeHtml(r.trigger||"")}</td>
      <td><span class="pill ${r.type==='video'?'video':'text'}">${escapeHtml(r.type||"text")}</span></td>
      <td>${escapeHtml(String(r.priority ?? ""))}</td>
      <td><span class="pill ${r.enabled===false?'off':'ok'}">${r.enabled===false?'OFF':'ON'}</span></td>
      <td>
        <button class="btn" data-edit="${escapeHtml(r._id)}">Editar</button>
      </td>
    </tr>
  `).join("");

  tbody.querySelectorAll("button[data-edit]").forEach(btn=>{
    btn.addEventListener("click", ()=>{
      const id = btn.getAttribute("data-edit");
      const item = (all||[]).find(x=>x._id===id);
      fillForm(item);
    });
  });
}

export async function saveCustom(){
  const id = $("customId").value.trim();
  const payload = readForm();
  if (!payload.trigger) throw new Error("Falta trigger");
  if (!payload.response && payload.type === "text") throw new Error("Falta respuesta");
  if (payload.type === "video" && !payload.videoId && !payload.videoUrl) throw new Error("Selecciona video o URL");

  if (!id){
    await apiFetch(`${API.admin}/custom-replies`, { method:"POST", body: payload });
    toast("✅ Creado");
  }else{
    await apiFetch(`${API.admin}/custom-replies/${id}`, { method:"PUT", body: payload });
    toast("✅ Actualizado");
  }
  fillForm(null);
  await loadCustom();
}

export async function deleteCustom(){
  const id = $("customId").value.trim();
  if (!id) return;
  if (!confirm("¿Eliminar esta respuesta?")) return;
  await apiFetch(`${API.admin}/custom-replies/${id}`, { method:"DELETE" });
  toast("🗑️ Eliminado");
  fillForm(null);
  await loadCustom();
}

export function newCustom(){ fillForm(null); }

export function bindCustom(){
  $("typeInput")?.addEventListener("change", onTypeChange);
  $("btnSaveCustom")?.addEventListener("click", ()=> saveCustom().catch(e=>toast(e.message)));
  $("btnNewCustom")?.addEventListener("click", newCustom);
  $("btnDeleteCustom")?.addEventListener("click", ()=> deleteCustom().catch(e=>toast(e.message)));
  $("customSearch")?.addEventListener("input", renderCustom);

  $("btnCustomTemplate")?.addEventListener("click", ()=> window.open(`${API.admin}/custom-replies/template-xlsx`, "_blank"));
  $("btnCustomExportCsv")?.addEventListener("click", ()=> window.open(`${API.admin}/custom-replies/export-csv`, "_blank"));
  $("btnCustomExportPdf")?.addEventListener("click", ()=> window.open(`${API.admin}/custom-replies/export-pdf`, "_blank"));
}
