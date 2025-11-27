// server.js
import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import OpenAI from "openai";
import path from "path";
import { fileURLToPath } from "url";

dotenv.config();

const app = express();

// Rutas absolutas (para /public)
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// CORS
app.use(
  cors({
    origin: "*", // luego puedes cambiar a ["https://utneza.store"]
  })
);

app.use(express.json());

// Archivos estáticos
app.use(express.static(path.join(__dirname, "public")));

// Cliente OpenAI
const client = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// Prompt
const SYSTEM_PROMPT = `
Eres el asistente virtual de un demo orientado a INDAUTOR y al sitio utneza.store.
Respondes SIEMPRE en ESPAÑOL, con tono profesional, amable y claro.

Funciones principales:
- Orientar al usuario sobre derechos de autor (NO información oficial).
- Responder dudas generales sobre contenidos del sitio utneza.store.
- Explicar conceptos sencillos.

Límites:
- No das asesoría legal vinculante.
- No representas a INDAUTOR.
- Si el usuario necesita trámites oficiales, indícalo claramente.
`;

// LOG EN MEMORIA
const chatLog = []; // { timestamp, message, reply }

/* ============================================================
   REGLAS DE RESPUESTAS FIJAS (AQUÍ CONTROLAS LO QUE QUIERES LIMITAR)
   ============================================================ */
const customRules = [
  {
    name: "Trámite oficial de registro",
    check: (msg) =>
      msg.includes("registro de obra") ||
      msg.includes("registrar una obra") ||
      msg.includes("cómo registro mi obra"),
    reply: `Sobre el trámite oficial de registro de obra 📄

Este asistente solo brinda información orientativa y general.
Para realizar un registro con validez legal, debes acudir a los
canales oficiales de INDAUTOR y seguir sus requisitos vigentes.

Te recomiendo consultar directamente la página oficial y,
en caso necesario, acercarte a la asesoría jurídica correspondiente.`
  },
  {
    name: "Asesoría legal",
    check: (msg) =>
      msg.includes("asesoría legal") ||
      msg.includes("abogado") ||
      msg.includes("demanda") ||
      msg.includes("juicio"),
    reply: `Respecto a consultas de tipo legal ⚖️

Este asistente NO puede ofrecer asesoría legal ni sustituir
el criterio de un profesional del derecho.

Te sugiero consultar directamente con un abogado o con las áreas
de orientación jurídica correspondientes.`
  },
  {
    name: "Horario de atención (ejemplo)",
    check: (msg) =>
      msg.includes("horario") ||
      msg.includes("a qué hora atienden") ||
      msg.includes("cuando atienden"),
    reply: `Horario de atención (ejemplo) 🕒

Este es un demo. Si fuera un portal real, aquí mostraríamos el
horario oficial de atención al público.

Por ahora, puedes usar este asistente en cualquier momento para
recibir orientación general.`
  },
    name: "Correo de contacto",
    check: (msg) =>
    msg.includes("correo") || msg.includes("email de contacto"),
  reply: `soporte-tecnico.sistema-indarelin@cultura.gob.mx
];

// GET /
app.get("/", (req, res) => {
  res.json({ ok: true, message: "Servidor INDAUTOR chatbot en línea 🚀" });
});

// GET /chat simple
app.get("/chat", (req, res) => {
  res.json({
    ok: true,
    message: "Este endpoint acepta POST para conversar con el chatbot.",
  });
});

// POST /chat
app.post("/chat", async (req, res) => {
  try {
    const { message, history = [] } = req.body;

    if (!message) {
      return res
        .status(400)
        .json({ error: "Falta el campo 'message' en el cuerpo de la petición." });
    }

    const lowerMsg = message.toLowerCase();

    // ============================================================
    // 1) REVISAR SI ALGUNA REGLA PERSONALIZADA APLICA
    // ============================================================
    const matchedRule = customRules.find((rule) => rule.check(lowerMsg));

    if (matchedRule) {
      const reply = matchedRule.reply;

      // Guardar en historial y log SIN llamar a OpenAI
      const newHistory = [
        ...history,
        { role: "user", content: message },
        { role: "assistant", content: reply },
      ];

      chatLog.push({
        timestamp: new Date().toISOString(),
        message,
        reply,
      });
      if (chatLog.length > 500) chatLog.shift();

      console.log(`✅ Respuesta fija usada: ${matchedRule.name}`);

      return res.json({ reply, history: newHistory });
    }

    // ============================================================
    // 2) SI NINGUNA REGLA APLICA → LLAMAMOS A OPENAI NORMAL
    // ============================================================
    const openaiResponse = await client.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        ...history,
        { role: "user", content: message },
      ],
    });

    const reply =
      openaiResponse.choices?.[0]?.message?.content ||
      "Lo siento, no pude generar respuesta.";

    const newHistory = [
      ...history,
      { role: "user", content: message },
      { role: "assistant", content: reply },
    ];

    // Guardar en log
    chatLog.push({
      timestamp: new Date().toISOString(),
      message,
      reply,
    });
    if (chatLog.length > 500) chatLog.shift();

    return res.json({ reply, history: newHistory });
  } catch (error) {
    console.error("❌ Error en /chat:", error.message || error);
    res.status(500).json({ error: "Error interno del servidor" });
  }
});

// GET /stats con filtro por fecha
app.get("/stats", (req, res) => {
  const { start, end } = req.query;

  let filtered = [...chatLog];

  if (start) {
    const startDate = new Date(start + "T00:00:00Z");
    filtered = filtered.filter(
      (item) => new Date(item.timestamp) >= startDate
    );
  }

  if (end) {
    const endDate = new Date(end + "T23:59:59Z");
    filtered = filtered.filter((item) => new Date(item.timestamp) <= endDate);
  }

  const totalMensajes = filtered.length;
  const ultimos = filtered.slice(-20).reverse();

  const porHora = {};
  filtered.forEach((item) => {
    const date = new Date(item.timestamp);
    const key = date.toISOString().slice(0, 13) + ":00";
    porHora[key] = (porHora[key] || 0) + 1;
  });

  const etiquetas = Object.keys(porHora).sort();
  const valores = etiquetas.map((k) => porHora[k]);

  res.json({
    totalMensajes,
    ultimos,
    grafica: {
      labels: etiquetas,
      data: valores,
    },
    filtro: { start: start || null, end: end || null },
  });
});

// PUERTO
const PORT = process.env.PORT || 10000;
app.listen(PORT, () =>
  console.log(`Servidor INDAUTOR chatbot en puerto ${PORT} 🔥`)
);

