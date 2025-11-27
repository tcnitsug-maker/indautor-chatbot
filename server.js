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
    origin: "*", // luego puedes limitar a ["https://utneza.store"]
  })
);

app.use(express.json());

// Archivos estáticos desde /public
app.use(express.static(path.join(__dirname, "public")));

// Cliente OpenAI
const client = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// Prompt del asistente
const SYSTEM_PROMPT = `
Eres el asistente virtual de un demo orientado a INDAUTOR y al sitio utneza.store.
Respondes SIEMPRE en ESPAÑOL, con tono profesional, amable y claro.

Funciones principales:
- Orientar al usuario sobre temas generales de derechos de autor (de forma NO oficial).
- Responder dudas generales sobre el contenido de utneza.store.
- Explicar conceptos de manera sencilla.

Límites:
- No das asesoría legal vinculante.
- No representas a INDAUTOR ni sustituyes a un abogado.
- Si el usuario requiere trámites oficiales o información con validez legal,
  indícale que consulte directamente los canales oficiales de INDAUTOR.
`;

// Log simple en memoria (demo)
const chatLog = []; // { timestamp, message, reply }

// Home simple
app.get("/", (req, res) => {
  res.json({ ok: true, message: "Servidor INDAUTOR chatbot en línea 🚀" });
});

// GET /chat solo informativo
app.get("/chat", (req, res) => {
  res.json({
    ok: true,
    message: "Este endpoint acepta POST con JSON para conversar con el chatbot 🙂",
  });
});

// Endpoint principal del chatbot
app.post("/chat", async (req, res) => {
  try {
    const { message, history = [] } = req.body;

    if (!message) {
      return res
        .status(400)
        .json({ error: "Falta el campo 'message' en el cuerpo de la petición." });
    }

    console.log("🔹 Solicitud a /chat:", {
      message,
      historyLength: Array.isArray(history) ? history.length : 0,
    });

    const openaiResponse = await client.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        ...(Array.isArray(history) ? history : []),
        { role: "user", content: message },
      ],
    });

    const reply =
      openaiResponse.choices?.[0]?.message?.content ||
      "Lo siento, no pude generar una respuesta en este momento.";

    const newHistory = [
      ...(Array.isArray(history) ? history : []),
      { role: "user", content: message },
      { role: "assistant", content: reply },
    ];

    // Guardar en log (máx 500 registros)
    chatLog.push({
      timestamp: new Date().toISOString(),
      message,
      reply,
    });
    if (chatLog.length > 500) {
      chatLog.shift();
    }

    return res.json({
      reply,
      history: newHistory,
    });
  } catch (error) {
    console.error("❌ Error en /chat:", error?.response?.data || error.message || error);
    return res.status(500).json({
      error: "Error interno en el servidor",
      details: error?.message || "Sin detalles",
    });
  }
});

// Endpoint de estadísticas para el admin
app.get("/stats", (req, res) => {
  const totalMensajes = chatLog.length;
  const ultimos = chatLog.slice(-20).reverse(); // últimos 20, más recientes primero

  // Conteo muy simple por hora (para la gráfica)
  const porHora = {};
  chatLog.forEach((item) => {
    const date = new Date(item.timestamp);
    const key = date.toISOString().slice(0, 13) + ":00"; // YYYY-MM-DDTHH:00
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
  });
});

// Puerto
const PORT = process.env.PORT || 10000;
app.listen(PORT, () => {
  console.log(`✅ Servidor escuchando en el puerto ${PORT}`);
});
