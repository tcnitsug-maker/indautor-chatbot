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

        loadMessages();
        loadCustomReplies();
      } else {
        document.getElementById("loginError").style.display = "block";
      }
    })
    .catch((err) => {
      console.error("Error al conectar:", err);
      alert("No se pudo conectar al servidor.");
    });
}

// ---------- MENSAJES ----------
function loadMessages() {
  fetch(API_URL + "/messages")
    .then((r) => r.json())
    .then((messages) => {
      const table = document.getElementById("messagesTable");
      table.innerHTML = "";

      messages.forEach((m) => {
        table.innerHTML += `
          <tr>
            <td>${m.role}</td>
            <td>${m.text}</td>
            <td>${new Date(m.createdAt).toLocaleString()}</td>
            <td><button class="deleteBtn" onclick="deleteMsg('${m._id}')">Eliminar</button></td>
          </tr>
        `;
      });
    });
}

function deleteMsg(id) {
  if (!confirm("¿Eliminar mensaje?")) return;

  fetch(API_URL + "/messages/" + id, { method: "DELETE" })
    .then(() => loadMessages());
}

// ---------- RESPUESTAS PERSONALIZADAS ----------
function loadCustomReplies() {
  fetch(CUSTOM_URL)
    .then((r) => r.json())
    .then((replies) => {
      const table = document.getElementById("customTable");
      table.innerHTML = "";

      replies.forEach((r) => {
        let kw = (r.keywords || []).join(", ");

        table.innerHTML += `
          <tr>
            <td>${r.question}</td>
            <td>${r.answer}</td>
            <td>${kw}</td>
            <td>${r.enabled ? "Sí" : "No"}</td>
            <td>
              <button onclick="fillCustomForm('${r._id}', \`${escapeHtml(
          r.question
        )}\`, \`${escapeHtml(r.answer)}\`, '${kw}', ${
          r.enabled ? "true" : "false"
        })">Editar</button>

              <button class="deleteBtn" onclick="deleteCustomReply('${r._id}')">Eliminar</button>
            </td>
          </tr>
        `;
      });
    });
}

function escapeHtml(text) {
  return String(text || "")
    .replace(/&/g, "&amp;")
    .replace(/`/g, "&#96;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function fillCustomForm(id, question, answer, keywords, enabled) {
  document.getElementById("customId").value = id;
  document.getElementById("customQuestion").value = question.replace(/&lt;/g, "<").replace(/&gt;/g, ">");
  document.getElementById("customAnswer").value = answer.replace(/&lt;/g, "<").replace(/&gt;/g, ">");
  document.getElementById("customKeywords").value = keywords;
  document.getElementById("customEnabled").checked = enabled;
}

function resetCustomForm() {
  document.getElementById("customId").value = "";
  document.getElementById("customQuestion").value = "";
  document.getElementById("customAnswer").value = "";
  document.getElementById("customKeywords").value = "";
  document.getElementById("customEnabled").checked = true;
}

document.getElementById("customForm").addEventListener("submit", function (e) {
  e.preventDefault();

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
    .then(() => loadCustomReplies());
}
