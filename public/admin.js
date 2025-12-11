// URL base del backend para admin
const API_BASE = "https://indautor-chatbot-1.onrender.com";
const API_URL = `${API_BASE}/admin`;
const CUSTOM_URL = `${API_BASE}/admin/custom-replies`;

// ---------- LOGIN ----------
function loginAdmin() {
  const pass = document.getElementById("adminPass").value;

  fetch(API_URL + "/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ password: pass }),
  })
    .then((r) => r.json())
    .then((data) => {
      if (data.ok) {
  document.getElementById("loginBox").style.display = "none";
  document.getElementById("panelBox").style.display = "block";

  loadMessages();
  loadCustomReplies();
  loadMetrics();   // <-- ESTO ES OBLIGATORIO PARA QUE FUNCIONE EL DASHBOARD
}
      } else {
        document.getElementById("loginError").style.display = "block";
      }
    })
    .catch((err) => {
      console.error("Error login:", err);
      alert("Error en el login");
    });
}

// ---------- TABS ----------
document.addEventListener("click", (e) => {
  if (e.target.classList.contains("tab")) {
    document.querySelectorAll(".tab").forEach((t) => t.classList.remove("active"));
    document.querySelectorAll(".tab-content").forEach((c) =>
      c.classList.remove("active")
    );
    e.target.classList.add("active");
    const tabId = e.target.getAttribute("data-tab");
    document.getElementById(tabId).classList.add("active");
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
    .then((r) => r.json())
    .then((messages) => {
      const tbody = document.getElementById("messagesTable");
      tbody.innerHTML = "";
      messages.forEach((m) => {
        const tr = document.createElement("tr");

        const rolTd = document.createElement("td");
        const badge = document.createElement("span");
        badge.className =
          "badge " + (m.role === "user" ? "user" : m.role === "bot" ? "bot" : "");
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
    .catch((err) => {
      console.error("Error loading messages:", err);
      alert("Error cargando mensajes");
    });
}

function deleteMessage(id) {
  if (!confirm("¿Eliminar este mensaje?")) return;

  fetch(`${API_URL}/messages/${id}`, { method: "DELETE" })
    .then(() => loadMessages())
    .catch((err) => {
      console.error("Error delete:", err);
      alert("Error eliminando mensaje");
    });
}

// ---------- CUSTOM REPLIES ----------
function loadCustomReplies() {
  fetch(CUSTOM_URL)
    .then((r) => r.json())
    .then((replies) => {
      const tbody = document.getElementById("customTable");
      tbody.innerHTML = "";
      replies.forEach((r) => {
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
    .catch((err) => {
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

// Guardar / actualizar
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
    .then((r) => r.json())
    .then(() => {
      resetCustomForm();
      loadCustomReplies();
    })
    .catch((err) => {
      console.error("Error guardando:", err);
      alert("Error guardando la respuesta personalizada");
    });
});

function deleteCustomReply(id) {
  if (!confirm("¿Eliminar esta respuesta personalizada?")) return;

  fetch(`${CUSTOM_URL}/${id}`, { method: "DELETE" })
    .then(() => loadCustomReplies())
    .catch((err) => {
      console.error("Error deleteCustomReply:", err);
      alert("Error eliminando respuesta personalizada");
    });
}
function loadMetrics() {
  fetch(API_URL + "/metrics")
    .then(r => r.json())
    .then(m => {
      // Datos básicos
      document.getElementById("m_total").textContent = m.totalMessages;
      document.getElementById("m_openai").textContent = m.openaiCount;
      document.getElementById("m_gemini").textContent = m.geminiCount;
      document.getElementById("m_custom").textContent = m.customCount;

      // ---- GRÁFICA 7 DÍAS ----
      new Chart(document.getElementById("chartDays"), {
        type: "line",
        data: {
          labels: m.last7Days.map(d => d._id),
          datasets: [{
            label: "Mensajes por día",
            data: m.last7Days.map(d => d.count),
            borderColor: "blue",
            borderWidth: 2,
            fill: false
          }]
        }
      });

      // ---- GRÁFICA HORAS ----
      new Chart(document.getElementById("chartHours"), {
        type: "bar",
        data: {
          labels: m.perHour.map(d => d._id + "h"),
          datasets: [{
            label: "Mensajes",
            data: m.perHour.map(d => d.count),
            backgroundColor: "orange"
          }]
        }
      });

      // ---- GRÁFICA ÚLTIMOS 30 DÍAS ----
      new Chart(document.getElementById("chartMonth"), {
        type: "line",
        data: {
          labels: m.last30Days.map(d => d._id),
          datasets: [{
            label: "Mensajes últimos 30 días",
            data: m.last30Days.map(d => d.count),
            borderColor: "purple",
            borderWidth: 2,
            fill: false
          }]
        },
        options: {
          scales: {
            x: { ticks: { maxRotation: 90, minRotation: 45 } },
            y: { beginAtZero: true }
          }
        }
      });

      // ---- GRÁFICA COMPARACIÓN SEMANAL ----
      new Chart(document.getElementById("chartWeeks"), {
        type: "bar",
        data: {
          labels: m.thisWeek.map(d => d._id),
          datasets: [
            {
              label: "Esta semana",
              data: m.thisWeek.map(d => d.count),
              backgroundColor: "green"
            },
            {
              label: "Semana anterior",
              data: m.lastWeek.map(d => d.count),
              backgroundColor: "gray"
            }
          ]
        }
      });

      // ---- PALABRAS MÁS USADAS ----
      const list = document.getElementById("topWords");
      list.innerHTML = "";
      m.topWords.forEach(w => {
        const li = document.createElement("li");
        li.textContent = `${w.word} (${w.count})`;
        list.appendChild(li);
      });
    });
}
