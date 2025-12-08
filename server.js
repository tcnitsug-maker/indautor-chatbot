<!DOCTYPE html>
<html lang="es">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>Admin - Respuestas</title>
<style>
body{font-family:Arial,Helvetica,sans-serif;background:#f4f6fb;margin:0;padding:20px}
.container{max-width:1100px;margin:0 auto;background:#fff;padding:18px;border-radius:10px;box-shadow:0 6px 18px rgba(16,24,40,0.06)}
h1{margin:0 0 12px 0}
.toolbar{display:flex;gap:8px;margin-bottom:12px;align-items:center;flex-wrap:wrap}
input,select,button{padding:8px;border-radius:6px;border:1px solid #d1d5db}
button{background:#0b61ff;color:white;border:none;cursor:pointer}
table{width:100%;border-collapse:collapse;margin-top:12px}
th,td{padding:10px;border-bottom:1px solid #eef2f6;text-align:left;vertical-align:top;font-size:14px}
th{background:#fafafa}
.small{font-size:12px;color:#6b7280}
.actions button{margin-right:6px;padding:6px 8px;font-size:13px}
.modal{position:fixed;inset:0;background:rgba(2,6,23,0.45);display:none;align-items:center;justify-content:center;padding:16px}
.card{background:white;padding:16px;border-radius:8px;width:100%;max-width:720px;box-shadow:0 10px 30px rgba(2,6,23,0.2)}
textarea{width:100%;min-height:100px;padding:8px;border-radius:6px;border:1px solid #d1d5db}
.pill{display:inline-block;padding:6px 8px;border-radius:999px;background:#f1f5f9;color:#0f172a;font-weight:600;font-size:12px}
.center{text-align:center}
.pagination{display:flex;gap:8px;align-items:center;margin-top:12px}
.ghost{background:#eef2ff;color:#0b61ff;border:1px solid #dbeafe}
</style>
</head>
<body>
<div class="container">
  <h1>Panel Administrativo — Respuestas</h1>

  <div class="toolbar">
    <input id="search" placeholder="Buscar..." />
    <select id="filterOrigin"><option value="">Todos</option><option value="manual">manual</option><option value="IA">IA</option></select>
    <input id="fromDate" type="date" />
    <input id="toDate" type="date" />
    <button id="btnRefresh" class="ghost">Actualizar</button>
    <button id="btnExport">Exportar CSV</button>
    <div style="flex:1"></div>
    <div class="small">API: <span id="apiBase" class="pill"></span></div>
  </div>

  <div style="overflow:auto; max-height:520px;">
    <table><thead><tr><th style="width:6%">#</th><th style="width:26%">Pregunta</th><th style="width:30%">Respuesta</th><th style="width:10%">Origen</th><th style="width:18%">Fecha</th><th style="width:10%">Acciones</th></tr></thead><tbody id="tbody"></tbody></table>
  </div>

  <div class="pagination">
    <button id="prevBtn" class="ghost">« Anterior</button>
    <div id="pageInfo" class="small">Página 1</div>
    <button id="nextBtn" class="ghost">Siguiente »</button>
  </div>
</div>

<!-- modal -->
<div id="modal" class="modal" role="dialog" aria-modal="true">
  <div class="card">
    <h3>Editar respuesta</h3>
    <label class="small">Pregunta</label>
    <div id="modalPregunta" style="padding:8px;background:#f8fafc;border-radius:6px;margin-bottom:6px;"></div>
    <label class="small">Respuesta manual</label>
    <textarea id="modalRespuesta"></textarea>
    <div style="margin-top:10px;display:flex;justify-content:flex-end;gap:8px">
      <button id="btnClose" class="ghost">Cancelar</button>
      <button id="btnSave">Guardar</button>
    </div>
  </div>
</div>

<script>
const API_BASE = location.origin; // si pruebas local con file:// usa http://localhost:3000
document.getElementById('apiBase').textContent = API_BASE;

let items = [], filtered = [], page =1, pageSize = 15;
const tbody = document.getElementById('tbody');

// fetch
async function fetchAll(){
  try{
    const res = await fetch(API_BASE + '/admin/respuestas');
    items = await res.json();
    // normalizar
    items = items.map(it=>{
      it._id = it._id && it._id._id ? it._id._id : (it._id && it._id.$oid ? it._id.$oid : it._id);
      it.pregunta = it.pregunta || it.userMessage || '';
      it.respuesta = it.respuesta_manual || it.respuesta_ai || it.botResponse || '';
      it.origen = it.origen || (it.respuesta_manual ? 'manual' : (it.respuesta_ai ? 'IA' : 'IA'));
      it.fecha = it.fecha ? new Date(it.fecha) : (it.timestamp ? new Date(it.timestamp) : new Date());
      return it;
    });
    applyFilters();
  }catch(e){
    console.error(e);
    tbody.innerHTML = '<tr><td colspan="6" class="center small">No se pudo recuperar la información</td></tr>';
  }
}

function applyFilters(){
  const q = (document.getElementById('search').value||'').toLowerCase();
  const origin = document.getElementById('filterOrigin').value;
  const from = document.getElementById('fromDate').value ? new Date(document.getElementById('fromDate').value) : null;
  const to = document.getElementById('toDate').value ? new Date(document.getElementById('toDate').value) : null;

  filtered = items.filter(it=>{
    let ok = true;
    if (q) ok = ( (it.pregunta+' '+it.respuesta).toLowerCase().includes(q) );
    if (ok && origin) ok = (it.origen||'').toLowerCase() === origin.toLowerCase();
    if (ok && from) ok = new Date(it.fecha) >= from;
    if (ok && to) {
      const t = new Date(it.fecha); t.setHours(23,59,59,999);
      ok = t <= new Date(to.getFullYear(), to.getMonth(), to.getDate(),23,59,59,999) ? (t <= to) : (t <= to);
      // simple fallback:
      ok = new Date(it.fecha) <= new Date(to.getFullYear(), to.getMonth(), to.getDate(),23,59,59,999);
    }
    return ok;
  });

  page = 1;
  renderTable();
}

function renderTable(){
  tbody.innerHTML = '';
  const total = filtered.length;
  const start = (page-1)*pageSize;
  const end = Math.min(start+pageSize, total);
  const pageItems = filtered.slice(start,end);

  if (!pageItems.length){
    tbody.innerHTML = '<tr><td colspan="6" class="center small">Sin resultados</td></tr>';
    document.getElementById('pageInfo').textContent = `Página ${page} — ${total} registros`;
    return;
  }

  pageItems.forEach((it,idx)=>{
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td>${start+idx+1}</td>
      <td><div style="max-height:72px;overflow:auto">${escapeHtml(it.pregunta)}</div></td>
      <td><div style="max-height:120px;overflow:auto">${escapeHtml(it.respuesta)}</div></td>
      <td>${escapeHtml(it.origen)}</td>
      <td>${new Date(it.fecha).toLocaleString()}</td>
      <td>
        <button data-id="${it._id}" data-action="edit" class="ghost">Editar</button>
        <button data-id="${it._id}" data-action="delete" style="background:#ef4444;color:white;border-radius:6px">Eliminar</button>
      </td>
    `;
    tbody.appendChild(tr);
  });

  document.getElementById('pageInfo').textContent = `Página ${page} — mostrando ${start+1}-${end} de ${total}`;
}

function escapeHtml(s){ if(!s) return ''; return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;'); }

// actions
tbody.addEventListener('click', async e=>{
  const btn = e.target.closest('button'); if(!btn) return;
  const id = btn.dataset.id; const action = btn.dataset.action;
  if (action === 'delete') {
    if(!confirm('¿Eliminar este registro?')) return;
    try {
      const r = await fetch(API_BASE + '/admin/respuestas/' + encodeURIComponent(id), { method:'DELETE' });
      if(!r.ok) throw new Error('error');
      items = items.filter(it => String(it._id) !== String(id));
      applyFilters();
    } catch (err) { alert('No se pudo eliminar. Revisa la consola.'); console.error(err); }
  } else if (action === 'edit') {
    const item = items.find(it => String(it._id) === String(id));
    if (!item) return alert('Registro no encontrado');
    openModal(item);
  }
});

// modal
const modal = document.getElementById('modal'), modalPregunta = document.getElementById('modalPregunta'), modalRespuesta = document.getElementById('modalRespuesta'), btnClose = document.getElementById('btnClose'), btnSave = document.getElementById('btnSave');
let editingId = null;

function openModal(item){
  editingId = item._id;
  modalPregunta.textContent = item.pregunta;
  modalRespuesta.value = item.respuesta;
  modal.style.display = 'flex';
}

btnClose.addEventListener('click', ()=> { modal.style.display='none'; editingId=null; });

btnSave.addEventListener('click', async ()=>{
  const newVal = modalRespuesta.value.trim();
  if (!editingId) return;
  try{
    const r = await fetch(API_BASE + '/admin/respuestas/' + encodeURIComponent(editingId), {
      method:'PUT',
      headers: {'Content-Type':'application/json'},
      body: JSON.stringify({ respuesta_manual: newVal, origen: 'manual' })
    });
    if(!r.ok) throw new Error('error');
    const it = items.find(i => String(i._id) === String(editingId));
    if (it) { it.respuesta = newVal; it.origen = 'manual'; }
    modal.style.display='none'; editingId=null; renderTable();
  }catch(e){ alert('No se pudo guardar. Revisa la consola.'); console.error(e); }
});

// search/filter/pagination/export
document.getElementById('search').addEventListener('input', applyFilters);
document.getElementById('filterOrigin').addEventListener('change', applyFilters);
document.getElementById('fromDate').addEventListener('change', applyFilters);
document.getElementById('toDate').addEventListener('change', applyFilters);
document.getElementById('btnRefresh').addEventListener('click', fetchAll);
document.getElementById('prevBtn').addEventListener('click', ()=>{ if(page>1){ page--; renderTable(); }});
document.getElementById('nextBtn').addEventListener('click', ()=>{ if(page < Math.ceil(filtered.length/pageSize)){ page++; renderTable(); }});
document.getElementById('btnExport').addEventListener('click', ()=>{
  const rows = filtered.map(it=>({ pregunta: it.pregunta, respuesta: it.respuesta, origen: it.origen, fecha: new Date(it.fecha).toISOString() }));
  const header = ['pregunta','respuesta','origen','fecha'];
  const csv = [header.join(',')].concat(rows.map(r => header.map(h => `"${String(r[h]||'').replace(/"/g,'""')}"`).join(','))).join('\n');
  const blob = new Blob([csv], { type:'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob); const a = document.createElement('a'); a.href = url; a.download = `respuestas_export_${new Date().toISOString().slice(0,10)}.csv`; a.click(); URL.revokeObjectURL(url);
});

// init
fetchAll();
</script>
</body>
</html>
