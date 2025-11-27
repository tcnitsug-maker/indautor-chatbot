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
You are the official support agent for the website utneza.store.

Your tasks:
- Help users navigate the site.
- Explain content related to Universidad Tecnológica de Nezahualcóyotl.
- Answer general questions about the projects or sections of the site.
- Always be respectful and clear.

LANGUAGE RULES:
- If the user writes in English, answer in English.
- If the user writes in Spanish but says "in English" or "en inglés", answer in English.
- If the user asks "in Nahuatl", "en náhuatl" or "nāhuatl", answer in Classical Nahuatl (Central Nahuatl).
- If the user asks for both English and Nahuatl, answer first in English and then add a second part labeled:
  "Nahuatl: <translation in Classical Nahuatl>".

Always follow these language rules exactly.
`;


// LOG EN MEMORIA
const chatLog = []; // { timestamp, message, reply }

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

    // Nuevo historial
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

    if (chatLog.length > 500) chatLog.shift(); // límite

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

  // Filtrar desde
  if (start) {
    const startDate = new Date(start + "T00:00:00Z");
    filtered = filtered.filter(
      (item) => new Date(item.timestamp) >= startDate
    );
  }

  // Filtrar hasta
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
