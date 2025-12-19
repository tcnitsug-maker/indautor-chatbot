import { apiFetch, API } from "./api.js";
import { $, toast, fmtDate, escapeHtml } from "./ui.js";

export async function loadVideos(){
  const vids = await apiFetch(`${API.admin}/videos`);
  const tbody = $("videosTable");
  tbody.innerHTML = (vids||[]).map(v=>`
    <tr>
      <td>${escapeHtml(v.originalName||v.filename||"")}</td>
      <td>${escapeHtml(fmtDate(v.createdAt))}</td>
      <td>
        <button class="btn" data-preview="${escapeHtml(v._id)}">Ver</button>
        <button class="btn danger" data-del="${escapeHtml(v._id)}">Eliminar</button>
      </td>
    </tr>
  `).join("");

  tbody.querySelectorAll("button[data-preview]").forEach(b=>{
    b.addEventListener("click", ()=>{
      const id = b.getAttribute("data-preview");
      const url = `${API.admin}/videos?id=${encodeURIComponent(id)}`; // fallback
      $("videoLibraryPreview").innerHTML = `<div class="small">ID: ${escapeHtml(id)}</div>`;
      // actual model likely stores publicUrl
      const v = (vids||[]).find(x=>x._id===id);
      const src = v?.url || v?.publicUrl || v?.path || "";
      if (src){
        $("videoLibraryPreview").innerHTML = `<video controls style="width:100%;max-height:360px;border-radius:14px"><source src="${escapeHtml(src)}"></video>`;
      }else{
        $("videoLibraryPreview").innerHTML = `<div class="hint">Este video no expone URL pública en el modelo. (Se puede ajustar.)</div>`;
      }
    });
  });

  tbody.querySelectorAll("button[data-del]").forEach(b=>{
    b.addEventListener("click", async ()=>{
      const id = b.getAttribute("data-del");
      if (!confirm("¿Eliminar video?")) return;
      await apiFetch(`${API.admin}/videos/${id}`, { method:"DELETE" });
      toast("🗑️ Video eliminado");
      await loadVideos();
    });
  });
}

export async function uploadVideo(){
  const f = $("videoFile").files?.[0];
  if (!f) throw new Error("Selecciona un video");
  const fd = new FormData();
  fd.append("video", f);
  await apiFetch(`${API.admin}/videos`, { method:"POST", body: fd });
  toast("✅ Video subido");
  $("videoFile").value = "";
  await loadVideos();
}

export function bindVideos(){
  $("btnReloadVideos")?.addEventListener("click", ()=> loadVideos().catch(e=>toast(e.message)));
  $("btnUploadVideo")?.addEventListener("click", ()=> uploadVideo().catch(e=>toast(e.message)));
}
