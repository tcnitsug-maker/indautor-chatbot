// URL del backend para el panel admin
const API_URL = "https://indautor-chatbot-1.onrender.com/admin";
const CUSTOM_URL = "https://indautor-chatbot-1.onrender.com/admin/custom-replies";

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
        // Carga inicial de datos
        loadMessages();
        loadCustomReplies();
      } else {
        document.getElementById("loginError").style.display = "block";
      }
    })
    .catch((err) => {
      console.error("Error al conectar con admin:", err);
      alert("No se pudo conectar con el servidor admin.");
    });
}

// ---------- MENSAJES ----------
function loadMessages() {
  fetch(API_URL + "/messages")
    .then((r) => r.json())
    .then((messages) => {
      const table = document.getElementById("messagesTable");
      if (!table) return;
      table.innerHTML = "";

      messages.forEach((m) => {
        const row = document.createElement("tr");

        const tdRole = document.createElement("td");
        tdRole.textContent = m.role;

        const tdText = document.createElement("td");
        tdText.textContent = m.text;

        const tdDate = document.createElement("td");
        tdDate.textContent = new Date(m.createdAt).toLocaleString();

        const tdAction = document.createElement("td");
        const btnDel = document.createElement("button");
        btnDel.textContent = "Eliminar";
        btnDel.className = "deleteBtn";
        btnDel.onclick = () => deleteMsg(m._id);
        tdAction.appendChild(btnDel);

        row.appendChild(tdRole);
        row.appendChild(tdText);
        row.appendChild(tdDate);
        row.appendChild(tdAction);
        table.appendChild(row);
      });

      // Actualizar card de resumen
      const cardTotal = document.getElementById("cardTotalMensajes");
      if (cardTotal) {
        cardTotal.textContent = messages.length.toString();
      }
    })
    .catch((err) => {
      console.error("Error cargando mensajes:", err);
      alert("No se pudieron cargar los mensajes.");
    });
}

function deleteMsg(id) {
  if (!confirm("¿Eliminar mensaje?")) return;

  fetch(API_URL + "/messages/" + id, { method: "DELETE" })
    .then(() => loadMessages())
    .catch((err) => {
      console.error("Error eliminando mensaje:", err);
      alert("No se pudo eliminar el mensaje.");
    });
}

// ---------- RESPUESTAS PERSONALIZADAS ----------

function loadCustomReplies() {
  fetch(CUSTOM_URL)
    .then((r) => r.json())
    .then((replies) => {
      const table = document.getElementById("customTable");
      if (!table) return;
      table.innerHTML = "";

      replies.forEach((r) => {
        const kw = (r.keywords || []).join(", ");
        const tr = document.createElement("tr");

        const tdQ = document.createElement("td");
        tdQ.textContent = r.question || "";

        const tdA = document.createElement("td");
        tdA.textContent = r.answer || "";

        const tdK = document.createElement("td");
        tdK.textContent = kw;

        const tdEnabled = document.createElement("td");
        const badge = document.createElement("span");
        badge.className = r.enabled ? "badge badge-success" : "badge";
        badge.textContent = r.enabled ? "Activa" : "Inactiva";
        tdEnabled.appendChild(badge);

        const tdActions = document.createElement("td");

        const btnEdit = document.createElement("button");
        btnEdit.textContent = "Editar";
        btnEdit.className = "btn-secondary";
        btnEdit.style.fontSize = "11px";
        btnEdit.onclick = () => {
          fillCustomForm(
            r._id,
            r.question || "",
            r.answer || "",
            kw,
            !!r.enabled
          );
        };

        const btnDel = document.createElement("button");
        btnDel.textContent = "Eliminar";
        btnDel.className = "deleteBtn";
        btnDel.style.marginLeft = "6px";
        btnDel.onclick = () => deleteCustomReply(r._id);

        tdActions.appendChild(btnEdit);
        tdActions.appendChild(btnDel);

        tr.appendChild(tdQ);
        tr.appendChild(tdA);
        tr.appendChild(tdK);
        tr.appendChild(tdEnabled);
        tr.appendChild(tdActions);

        table.appendChild(tr);
      });

      // Actualizar card resumen
      const cardTotal = document.getElementById("cardTotalRespuestas");
      if (cardTotal) {
        cardTotal.textContent = replies.length.toString();
      }
    })
    .catch((err) => {
      console.error("Error cargando respuestas personalizadas:", err);
      alert("No se pudieron cargar las respuestas personalizadas.");
    });
}

function fillCustomForm(id, question, answer, keywords, enabled) {
  document.getElementById("customId").value = id || "";
  document.getElementById("customQuestion").value = question || "";
  document.getElementById("customAnswer").value = answer || "";
  document.getElementById("customKeywords").value = keywords || "";
  document.getElementById("customEnabled").checked = !!enabled;
}

function resetCustomForm() {
  const idInput = document.getElementById("customId");
  const qInput = document.getElementById("customQuestion");
  const aInput = document.getElementById("customAnswer");
  const kInput = document.getElementById("customKeywords");
  const enabledInput = document.getElementById("customEnabled");

  if (idInput) idInput.value = "";
  if (qInput) qInput.value = "";
  if (aInput) aInput.value = "";
  if (kInput) kInput.value = "";
  if (enabledInput) enabledInput.checked = true;
}

function submitCustomForm(event) {
  event.preventDefault();

  const id = document.getElementById("customId").value;
  const question = document.getElementById("customQuestion").value.trim();
  const answer = document.getElementById("customAnswer").value.trim();
  const keywords = document.getElementById("customKeywords").value.trim();
  const enabled = document.getElementById("customEnabled").checked;

  if (!question || !answer) {
    alert("La pregunta y la respuesta son obligatorias.");
    return;
  }

  const payload = { question, answer, keywords, enabled };

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
      console.error("Error guardando respuesta personalizada:", err);
      alert("No se pudo guardar la respuesta personalizada.");
    });
}

function deleteCustomReply(id) {
  if (!confirm("¿Eliminar esta respuesta personalizada?")) return;

  fetch(`${CUSTOM_URL}/${id}`, { method: "DELETE" })
    .then((r) => r.json())
    .then(() => loadCustomReplies())
    .catch((err) => {
      console.error("Error eliminando respuesta personalizada:", err);
      alert("No se pudo eliminar la respuesta personalizada.");
    });
}

document.addEventListener("DOMContentLoaded", () => {
  const form = document.getElementById("customForm");
  if (form) {
    form.addEventListener("submit", submitCustomForm);
  }
});
