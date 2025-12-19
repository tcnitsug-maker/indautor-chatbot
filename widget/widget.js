(function () {
  const API_CHAT = "https://indautor-chatbot-1.onrender.com/chat";

  // ---- Load CSS ----
  const css = document.createElement("link");
  css.rel = "stylesheet";
  css.href = "https://indautor-chatbot-1.onrender.com/widget/widget.css";
  document.head.appendChild(css);

  // ---- Button ----
  const btn = document.createElement("button");
  btn.id = "indarelin-widget-btn";
  btn.innerHTML = "💬";
  document.body.appendChild(btn);

  // ---- Chat Box ----
  const box = document.createElement("div");
  box.id = "indarelin-widget-box";
  box.innerHTML = `
    <div id="indarelin-header">
      <span>INDARELÍN</span>
      <span style="cursor:pointer" id="indarelin-close">✕</span>
    </div>
    <div id="indarelin-messages"></div>
    <div id="indarelin-input-box">
      <input id="indarelin-input" placeholder="Escribe tu mensaje..." />
      <button id="indarelin-send">➤</button>
    </div>
  `;
  document.body.appendChild(box);

  const messages = box.querySelector("#indarelin-messages");
  const input = box.querySelector("#indarelin-input");

  function addMsg(text, cls) {
    const div = document.createElement("div");
    div.className = `indarelin-msg ${cls}`;
    div.textContent = text;
    messages.appendChild(div);
    messages.scrollTop = messages.scrollHeight;
  }

  async function sendMsg() {
    const text = input.value.trim();
    if (!text) return;
    addMsg(text, "indarelin-user");
    input.value = "";

    try {
      const r = await fetch(API_CHAT, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: text })
      });
      const j = await r.json();
      addMsg(j.reply || "Sin respuesta", "indarelin-bot");
    } catch (e) {
      addMsg("Error de conexión. Intenta más tarde.", "indarelin-bot");
    }
  }

  btn.onclick = () => (box.style.display = "flex");
  box.querySelector("#indarelin-close").onclick = () => (box.style.display = "none");
  box.querySelector("#indarelin-send").onclick = sendMsg;
  input.addEventListener("keydown", e => e.key === "Enter" && sendMsg());

  // Mensaje inicial
  addMsg("Hola 👋 Soy INDARELÍN, tu asistente institucional.", "indarelin-bot");
})();
