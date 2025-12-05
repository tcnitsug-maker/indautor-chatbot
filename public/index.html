<!DOCTYPE html>
<html lang="es">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width,initial-scale=1" />
<title>Asistente INDARELÍN</title>
<style>
/* Simple styles for the widget */
#gemini-chatbot-widget {
  position: fixed;
  right: 20px;
  bottom: 20px;
  z-index: 9999;
  font-family: Arial, sans-serif;
}
#gemini-chat-btn {
  width: 60px;
  height: 60px;
  border-radius: 50%;
  background: #0066cc;
  border: none;
  box-shadow: 0 4px 12px rgba(0,0,0,0.2);
  cursor: pointer;
  color: white;
  font-size: 24px;
}
#gemini-chat-window {
  width: 320px;
  max-height: 480px;
  background: white;
  border-radius: 8px;
  box-shadow: 0 8px 24px rgba(0,0,0,0.2);
  overflow: hidden;
  display: flex;
  flex-direction: column;
}
#chat-header {
  background: #0466d9;
  color: white;
  padding: 10px;
  display:flex;
  justify-content:space-between;
  align-items:center;
}
#chat-messages {
  padding: 10px;
  overflow-y: auto;
  flex: 1 1 auto;
  background: #f7f7f7;
}
.chat-message {
  margin: 6px 0;
  padding: 8px 10px;
  border-radius: 8px;
  max-width: 86%;
}
.user-msg {
  align-self: flex-end;
  background: #e1ffc7;
}
.bot-msg {
  align-self: flex-start;
  background: #ffffff;
  box-shadow: 0 1px 0 rgba(0,0,0,0.06);
}
#chat-input-area {
  display:flex;
  gap:6px;
  padding: 10px;
  background: #fff;
}
#chat-input {
  flex:1;
  padding:8px;
  border-radius:6px;
  border:1px solid #ddd;
}
#send-btn {
  padding:8px 12px;
  background:#0466d9;
  color:white;
  border:none;
  border-radius:6px;
  cursor:pointer;
}
</style>
</head>
<body>
<div id="gemini-chatbot-widget"></div>

<script>
// =========================================================
// RESPUESTAS LOCALES (INDARELÍN / INDAUTOR)
// =========================================================

const PRECONFIGURED_ANSWERS = {
  "tiempo registro obra":
    "El registro de una obra tarda aproximadamente 15 días hábiles una vez firmada la solicitud en INDARELÍN.",

  "registro obra sigue proceso":
    "El plazo de respuesta es de hasta 15 días hábiles. A veces tarda menos, pero depende de la carga de trabajo de INDAUTOR.",

  "reservas derechos":
    "Las reservas de derechos permiten proteger nombres, títulos y personajes de publicaciones periódicas o difusiones continuas.",

  "costo registro obra":
    "El costo actual del registro de obra es de $353 MXN. Verifique siempre las tarifas actualizadas en el portal oficial de INDAUTOR.",

  "documentos registro obra":
    "Requisitos generales: Formato de solicitud INDAUTOR, comprobante de pago e identificación oficial vigente.",

  "que es indarelin":
    "INDARELÍN es la plataforma electrónica de INDAUTOR para realizar trámites de derechos de autor en línea.",

  "certificado no coincide firmante":
    "Si ya generaste la línea de captura y el certificado no coincide con el firmante, no se puede corregir sobre el mismo trámite. Debes iniciar uno nuevo y, en su caso, solicitar la devolución del pago anterior.",

  "contraseñas no coinciden":
    "Debes usar la contraseña de tu e.firma (FIEL). Puedes validar su vigencia en el portal del SAT.",

  "no llega correo activacion":
    "Revisa la bandeja de spam o correo no deseado. El correo de activación o acuse a veces llega ahí.",

  "escribi mal rfc":
    "Si escribiste mal el RFC y ya generaste la línea de captura en INDARELÍN, deberás iniciar nuevamente el trámite y solicitar la devolución del pago si corresponde."
};


// =========================================================
// INTENTOS ESPECIALES (MOTOR DE INTENCIÓN SIMPLE)
// =========================================================

const INTENTS = [
  {
    id: "doble_pago",
    keywords: ["pague dos veces", "pagué dos veces", "pague doble", "pagué doble", "doble pago"],
    answer:
      "Si realizaste el pago dos veces (doble pago), conserva ambos comprobantes. Normalmente debes:\n\n" +
      "1) Continuar el trámite con el pago correcto.\n" +
      "2) Solicitar la devolución del pago duplicado por los canales oficiales de INDAUTOR (área de devoluciones).\n\n" +
      "Verifica en el portal o en la información oficial el procedimiento específico para devoluciones."
  },
  {
    id: "problema_efirma",
    keywords: ["problema con e.firma", "problema con efirma", "no acepta efirma", "no reconoce mi efirma", "no reconoce mi e firma"],
    answer:
      "Si tienes problemas con tu e.firma en INDARELÍN, revisa lo siguiente:\n\n" +
      "1) Que los archivos .cer y .key sean los vigentes.\n" +
      "2) Que la contraseña que ingresas sea la de la e.firma (FIEL), respetando mayúsculas/minúsculas.\n" +
      "3) Que tu e.firma no esté revocada o vencida; puedes validarla en el portal del SAT.\n\n" +
      "Si el problema persiste, toma captura del mensaje de error y contacta a INDAUTOR por los canales oficiales."
  },
  {
    id: "no_puedo_subir_archivo",
    keywords: ["no puedo subir archivo", "no me deja subir archivo", "error al subir archivo", "problema al subir archivo"],
    answer:
      "Si INDARELÍN no te permite subir un archivo, prueba lo siguiente:\n\n" +
      "1) Verifica que el formato del archivo sea el permitido (por ejemplo, PDF u otro especificado en el trámite).\n" +
      "2) Revisa que el tamaño no exceda el límite indicado en la plataforma.\n" +
      "3) Cambia de navegador (Chrome, Edge, Firefox) y borra caché si es posible.\n" +
      "4) Intenta renombrar el archivo sin caracteres especiales.\n\n" +
      "Si el problema continúa, toma captura del error y repórtalo a soporte de INDARELÍN."
  },
  {
    id: "error_pdf",
    keywords: ["error en pdf", "pdf da error", "no abre mi pdf", "problema con pdf", "no se ve el pdf"],
    answer:
      "Si tienes un error con el PDF en INDARELÍN, considera lo siguiente:\n\n" +
      "1) Abre el PDF en tu equipo para confirmar que no esté dañado.\n" +
      "2) Genera el PDF nuevamente desde la fuente original (Word, escáner, etc.) usando una resolución legible pero no excesiva.\n" +
      "3) Verifica que el tamaño del archivo no exceda el límite permitido.\n" +
      "4) Evita contraseñas o bloqueos en el PDF.\n\n" +
      "Si aún así marca error en la plataforma, guarda captura de pantalla y repórtalo a soporte de INDARELÍN."
  }
];


// =========================================================
// CONFIGURACIONES DE IA
// =========================================================

// URL de tu backend para INDARELÍN
const GEMINI_API_ENDPOINT = "https://indautor-chatbot-1.onrender.com/chat";
const OPENAI_API_ENDPOINT = ""; // si no usas OpenAI, déjalo vacío.


// =========================================================
// FUNCIONES DE SOPORTE
// =========================================================

function normalize(text) {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim();
}

function similarity(a, b) {
  const longer = a.length > b.length ? a : b;
  const shorter = a.length > b.length ? b : a;
  const longerLength = longer.length;
  if (longerLength === 0) return 1.0;
  return (longerLength - editDistance(longer, shorter)) / longerLength;
}

function editDistance(s1, s2) {
  s1 = s1.toLowerCase();
  s2 = s2.toLowerCase();
  const costs = [];
  for (let i = 0; i <= s1.length; i++) {
    let lastValue = i;
    for (let j = 0; j <= s2.length; j++) {
      if (i === 0) {
        costs[j] = j;
      } else if (j > 0) {
        let newValue = costs[j - 1];
        if (s1[i - 1] !== s2[j - 1]) {
          newValue = Math.min(Math.min(newValue, lastValue), costs[j]) + 1;
        }
        costs[j - 1] = lastValue;
        lastValue = newValue;
      }
    }
    costs[s2.length] = lastValue;
  }
  return costs[s2.length];
}


// =========================================================
// MOTOR DE INTENCIÓN
// =========================================================

function getIntentAnswer(message) {
  const normalizedMsg = normalize(message);

  let bestIntent = null;
  let bestScore = 0;

  for (const intent of INTENTS) {
    let hits = 0;
    for (const kw of intent.keywords) {
      const nk = normalize(kw);
      if (normalizedMsg.includes(nk)) {
        hits++;
      }
    }
    const score = hits / intent.keywords.length;
    if (score > bestScore) {
      bestScore = score;
      bestIntent = intent;
    }
  }

  // Umbral muy bajo para que con que pegue 1–2 palabras ya responda
  if (bestIntent && bestScore > 0) {
    return bestIntent.answer;
  }

  return null;
}


// =========================================================
// RESPUESTA LOCAL MEJORADA
// =========================================================

function getLocalAnswer(message) {
  const normalizedMsg = normalize(message);
  const msgTokens = normalizedMsg.split(/\s+/).filter(Boolean);

  let bestKey = null;
  let bestScore = 0;

  for (let key in PRECONFIGURED_ANSWERS) {
    const normalizedKey = normalize(key);
    const keyTokens = normalizedKey.split(/\s+/).filter(Boolean);

    // Coincidencia por palabras clave
    let hits = 0;
    for (const token of keyTokens) {
      if (normalizedMsg.includes(token)) hits++;
    }
    const tokenScore = hits / keyTokens.length;

    // Similitud adicional
    const levScore = similarity(normalizedMsg, normalizedKey);

    // Peso combinado
    const finalScore = (tokenScore * 0.7) + (levScore * 0.3);

    if (finalScore > bestScore) {
      bestScore = finalScore;
      bestKey = key;
    }
  }

  // Acepta si coincide al menos 0.5 (ajustable)
  if (bestScore >= 0.5) {
    return PRECONFIGURED_ANSWERS[bestKey];
  }

  return null;
}


// =========================================================
// LLAMADAS IA (BACKEND INDARELÍN)
// =========================================================

async function getGeminiAnswer(message) {
  try {
    const response = await fetch(GEMINI_API_ENDPOINT, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ message })
    });

    if (!response.ok) {
      return "🤖 Error conectando con el servidor del Asistente INDARELÍN.";
    }

    const data = await response.json();
    return `🤖 ${data.reply}`;
  } catch (error) {
    return "🤖 El servicio del Asistente INDARELÍN no está disponible por el momento.";
  }
}


// =========================================================
// CHATBOT COMPLETO
// =========================================================

document.addEventListener("DOMContentLoaded", () => {
  const root = document.getElementById("gemini-chatbot-widget");

  // Botón flotante
  const btn = document.createElement("button");
  btn.id = "gemini-chat-btn";
  btn.innerHTML = "💬";
  root.appendChild(btn);

  const win = document.createElement("div");
  win.id = "gemini-chat-window";
  win.style.display = "none";
  win.innerHTML = `
    <div id="chat-header">
      <span>Asistente INDARELÍN</span>
      <button id="close-chat-btn">×</button>
    </div>
    <div id="chat-messages"></div>
    <div id="chat-input-area">
      <input type="text" id="chat-input" placeholder="Preguntas sobre INDARELÍN o trámites de INDAUTOR...">
      <button id="send-btn">Enviar</button>
    </div>
  `;
  root.appendChild(win);

  const msgContainer = win.querySelector("#chat-messages");
  const inputField = win.querySelector("#chat-input");
  const sendBtn = win.querySelector("#send-btn");
  const closeBtn = win.querySelector("#close-chat-btn");

  let isTyping = false;

  btn.onclick = () => {
    win.style.display = (win.style.display === "none") ? "flex" : "none";
    if (win.style.display === "flex" && msgContainer.children.length === 0) {
      addMessage("¡Hola! Soy el Asistente INDARELÍN. Puedo orientarte sobre trámites en línea de INDAUTOR. ¿En qué puedo ayudarte?", "bot");
    }
    inputField.focus();
  };

  closeBtn.onclick = () => win.style.display = "none";

  function addMessage(text, from) {
    const div = document.createElement("div");
    div.className = `chat-message ${from}-msg`;
    div.textContent = text;
    msgContainer.appendChild(div);
    msgContainer.scrollTop = msgContainer.scrollHeight;
  }

  function setTyping(state) {
    isTyping = state;
    sendBtn.disabled = state;
    inputField.disabled = state;

    if (state) {
      const div = document.createElement("div");
      div.className = "chat-message bot-msg typing-indicator";
      div.textContent = "Escribiendo...";
      msgContainer.appendChild(div);
    } else {
      const ind = msgContainer.querySelector(".typing-indicator");
      if (ind) ind.remove();
    }
  }

  inputField.addEventListener("keydown", e => {
    if (e.key === "Enter") handleUserInput();
  });

  sendBtn.onclick = handleUserInput;

  async function handleUserInput() {
    if (isTyping) return;

    const userMessage = inputField.value.trim();
    if (!userMessage) return;

    addMessage(userMessage, "user");
    inputField.value = "";
    setTyping(true);

    // 0. Motor de intención (casos especiales: doble pago, e.firma, archivo, pdf)
    const intent = getIntentAnswer(userMessage);
    if (intent) {
      setTyping(false);
      addMessage(intent, "bot");
      return;
    }

    // 1. Respuesta local genérica
    const local = getLocalAnswer(userMessage);
    if (local) {
      setTyping(false);
      addMessage(local, "bot");
      return;
    }

    // 2. Llamar al backend INDARELÍN
    const aiResp = await getGeminiAnswer(userMessage);

    setTyping(false);
    addMessage(aiResp, "bot");
  }
});
</script>

</body>
</html>
