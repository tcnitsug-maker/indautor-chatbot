
fetch('/admin/custom-replies')
.then(r=>r.json())
.then(data=>{
  const t=document.getElementById('tbl');
  data.forEach(r=>{
    const tr=document.createElement('tr');
    tr.innerHTML=`<td>${r.trigger}</td><td>${r.type}</td><td>${r.priority}</td>`;
    t.appendChild(tr);
  });
});
