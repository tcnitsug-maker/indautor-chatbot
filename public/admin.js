// URL base del backend
const API_BASE = "https://indautor-chatbot-1.onrender.com";
const API_URL = `${API_BASE}/admin`;
const CUSTOM_URL = `${API_BASE}/admin/custom-replies`;
const METRICS_URL = `${API_BASE}/metrics`;

let pieChart = null;
let barChart = null;

// ---------- LOGIN ----------
function loginAdmin() {
  const pass = document.getElementById("adminPass").value;

  fetch(API_URL + "/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ password: pass }),
  })
    .then(r => r.json())
    .then(data => {
      if (data.ok) {
        document.getElementById("loginBox").style.display = "none";
        document.getElementById("panelBox").style.display = "block";

        loadMessages();
        loadCustomReplies();
        loadMetrics(); // cargar métricas al entrar
      } else {
        document.getElementById("loginError").style.display = "block";
      }
    })
    .catch(err => {
      console.error("Error login:", err);
      alert("Error en el login");
    });
}

// ---------- TABS ----------
document.addEventListener("click", e => {
  if (e.target.classList.contains("tab")) {
    document.querySelectorAll(".tab").forEach(t => t.classList.remove("active"));
    document.querySelectorAll(".tab-content").forEach(c => c.classList.remove("active"));

    e.target.classList.add("active");
    const tabId = e.target.getAttribute("data-tab");
    document.getElementById(tabId).classList.add("active");

    if (tabId === "tabMetrics") {
      loadMetrics(); // Cargar métricas al abrir pestaña
    }
  }
});

// ---------- HISTORIAL ----------
function formatDate(iso) {
  if (!iso) return "";
  const d = new Date(iso);
  return d.toLocaleString();
}

function escapeHtml(text) {
  return String(text || "")
    .replace(/&/g, "&amp;")
    .replace(/`/g, "&#96;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function loadMessages() {
  fetch(API_URL + "/messages")
    .then(r => r.json())
    .then(messages => {
      const tbody = document.getElementById("messagesTable");
      tbody.innerHTML = "";

      messages.forEach(m => {
        const tr = document.createElement("tr");

        const rolTd = document.createElement("td");
        const badge = document.createElement("span");
        badge.className = "badge " + (m.role === "user" ? "user" : "bot");
        badge.textContent = m.role;
        rolTd.appendChild(badge);

        const textTd = document.createElement("td");
        textTd.innerHTML = `<div class="small">${escapeHtml(m.text)}</div>`;

        const dateTd = document.createElement("td");
        dateTd.textContent = formatDate(m.createdAt);

        const delTd = document.createElement("td");
        const btn = document.createElement("button");
        btn.textContent = "🗑️";
        btn.onclick = () => deleteMessage(m._id);
        delTd.appendChild(btn);

        tr.appendChild(rolTd);
        tr.appendChild(textTd);
        tr.appendChild(dateTd);
        tr.appendChild(delTd);

        tbody.appendChild(tr);
      });
    })
    .catch(err => {
      console.error("Error loading messages:", err);
      alert("Error cargando mensajes");
    });
}

function deleteMessage(id) {
  if (!confirm("¿Eliminar este mensaje?")) return;

  fetch(`${API_URL}/messages/${id}`, { method: "DELETE" })
    .then(() => loadMessages())
    .catch(err => {
      console.error("Error delete:", err);
      alert("Error eliminando mensaje");
    });
}

// ---------- CUSTOM REPLIES ----------
function loadCustomReplies() {
  fetch(CUSTOM_URL)
    .then(r => r.json())
    .then(replies => {
      const tbody = document.getElementById("customTable");
      tbody.innerHTML = "";

      replies.forEach(r => {
        const tr = document.createElement("tr");

        const qTd = document.createElement("td");
        qTd.innerHTML = `<div class="small">${escapeHtml(r.question)}</div>`;

        const aTd = document.createElement("td");
        aTd.innerHTML = `<div class="small">${escapeHtml(r.answer)}</div>`;

        const kTd = document.createElement("td");
        const kws = (r.keywords || []).join(", ");
        kTd.innerHTML = `<div class="small">${escapeHtml(kws)}</div>`;

        const enTd = document.createElement("td");
        enTd.textContent = r.enabled ? "Sí" : "No";

        const actTd = document.createElement("td");
        const btnEdit = document.createElement("button");
        btnEdit.textContent = "✏️";
        btnEdit.onclick = () =>
          fillCustomForm(
            r._id,
            r.question,
            r.answer,
            (r.keywords || []).join(", "),
            r.enabled
          );

        const btnDel = document.createElement("button");
        btnDel.textContent = "🗑️";
        btnDel.style.marginLeft = "4px";
        btnDel.onclick = () => deleteCustomReply(r._id);

        actTd.appendChild(btnEdit);
        actTd.appendChild(btnDel);

        tr.appendChild(qTd);
        tr.appendChild(aTd);
        tr.appendChild(kTd);
        tr.appendChild(enTd);
        tr.appendChild(actTd);

        tbody.appendChild(tr);
      });
    })
    .catch(err => {
      console.error("Error loadCustomReplies:", err);
      alert("Error cargando respuestas personalizadas");
    });
}

function fillCustomForm(id, question, answer, keywords, enabled) {
  document.getElementById("customId").value = id;
  document.getElementById("customQuestion").value = question;
  document.getElementById("customAnswer").value = answer;
  document.getElementById("customKeywords").value = keywords || "";
  document.getElementById("customEnabled").checked = !!enabled;
}

function resetCustomForm() {
  document.getElementById("customId").value = "";
  document.getElementById("customQuestion").value = "";
  document.getElementById("customAnswer").value = "";
  document.getElementById("customKeywords").value = "";
  document.getElementById("customEnabled").checked = true;
}

document.getElementById("customForm").addEventListener("submit", (e) => {
  e.preventDefault();

  const id = document.getElementById("customId").value;

  const payload = {
    question: document.getElementById("customQuestion").value,
    answer: document.getElementById("customAnswer").value,
    keywords: document.getElementById("customKeywords").value,
    enabled: document.getElementById("customEnabled").checked,
  };

  const url = id ? `${CUSTOM_URL}/${id}` : CUSTOM_URL;
  const method = id ? "PUT" : "POST";

  fetch(url, {
    method,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  })
    .then(r => r.json())
    .then(() => {
      resetCustomForm();
      loadCustomReplies();
    })
    .catch(err => {
      console.error("Error guardando:", err);
      alert("Error guardando la respuesta personalizada");
    });
});

function deleteCustomReply(id) {
  if (!confirm("¿Eliminar esta respuesta personalizada?")) return;

  fetch(`${CUSTOM_URL}/${id}`, { method: "DELETE" })
    .then(() => loadCustomReplies())
    .catch(err => {
      console.error("Error deleteCustomReply:", err);
      alert("Error eliminando respuesta personalizada");
    });
}

// ---------- MÉTRICAS ----------

function loadMetrics() {
  fetch(METRICS_URL)
    .then(r => r.json())
    .then(data => {
      showMetrics(data);
    })
    .catch(err => console.error("Error cargando métricas:", err));
}

function consultarRango() {
  const s = document.getElementById("startDate").value;
  const e = document.getElementById("endDate").value;

  if (!s || !e) {
    alert("Selecciona las fechas");
    return;
  }

  fetch(`${METRICS_URL}/range?start=${s}&end=${e}`)
    .then(r => r.json())
    .then(data => showMetrics(data));
}

function filtroRapido(dias) {
  let start = new Date();
  let end = new Date();

  if (dias === "hoy") {
    start = new Date();
  } else {
    start.setDate(start.getDate() - parseInt(dias));
  }

  const s = start.toISOString().split("T")[0];
  const e = end.toISOString().split("T")[0];

  fetch(`${METRICS_URL}/range?start=${s}&end=${e}`)
    .then(r => r.json())
    .then(data => showMetrics(data));
}

function showMetrics(data) {
  document.getElementById("m_total").textContent = data.total;
  document.getElementById("m_ia").textContent = data.ia;
  document.getElementById("m_custom").textContent = data.custom;

  renderPie(data);
  renderBars(data);
  renderTop(data);
}

function renderPie(data) {
  const ctx = document.getElementById("pieChart");

  if (pieChart) pieChart.destroy();

  pieChart = new Chart(ctx, {
    type: "pie",
    data: {
      labels: ["IA", "Personalizadas"],
      datasets: [
        {
          data: [data.ia, data.custom],
          backgroundColor: ["#007bff", "#28a745"],
        },
      ],
    }
  });
}

function renderBars(data) {
  const ctx = document.getElementById("barChart");

  if (barChart) barChart.destroy();

  const labels = data.porDia.map(x => x._id);
  const values = data.porDia.map(x => x.total);

  barChart = new Chart(ctx, {
    type: "bar",
    data: {
      labels,
      datasets: [
        {
          label: "Mensajes por día",
          backgroundColor: "#17a2b8",
          data: values,
        },
      ],
    },
  });
}

function renderTop(data) {
  const list = document.getElementById("topList");
  list.innerHTML = "";

  data.topPreguntas.forEach(item => {
    const li = document.createElement("li");
    li.textContent = `${item._id} — ${item.count} veces`;
    list.appendChild(li);
  });
}
