// server.js
import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import OpenAI from "openai";
import path from "path";
import { fileURLToPath } from "url";

// Necesario para rutas absolutas ESModule
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Archivos estáticos desde /public
app.use(express.static(path.join(__dirname, "public")));


dotenv.config();

const app = express();

// 🔓 CORS (puedes limitar luego el origin)
app.use(
  cors({
    origin: "*", // o ["https://utneza.store"] si quieres cerrarlo
  })
);

app.use(express.json());

// 💡 Cliente de OpenAI
const client = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// 🧠 Prompt del asistente
const SYSTEM_PROMPT = `
Eres el asistente virtual de un demo orientado a INDAUTOR
Respondes SIEMPRE en ESPAÑOL, con tono profesional, amable y claro.

Funciones principales:
- Orientar al usuario sobre temas generales de derechos de autor (de forma NO oficial).
- Responder dudas generales sobre el contenido de sindautor.cultura.gob.mx.
- Explicar conceptos de manera sencilla.

Límites:
- No das asesoría legal vinculante.
- No representas a INDAUTOR ni sustituyes a un abogado.
- Si el usuario requiere trámites oficiales o información con validez legal,
  indícale que consulte directamente los canales oficiales de INDAUTOR.
`;

// ✅ Endpoint de prueba simple (opcional, para comprobar que el server vive)
app.get("/", (req, res) => {
  res.json({ ok: true, message: "Servidor INDAUTOR chatbot en línea 🚀" });
});

// 💬 Endpoint principal del chatbot
app.post("/chat", async (req, res) => {
  try {
    const { message, history = [] } = req.body;

    if (!message) {
      return res
        .status(400)
        .json({ error: "Falta el campo 'message' en el cuerpo de la petición." });
      app.get("/chat", (req, res) => {
  res.json({
    ok: true,
    message: "Este endpoint acepta POST para conversar con el chatbot 🙂"
  });
        
    }

    console.log("🔹 Solicitud a /chat:", {
      message,
      historyLength: Array.isArray(history) ? history.length : 0,
      
    });

    // Llamada al modelo de OpenAI
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

// 🚪 Puerto (Render usa PORT por env var)
const PORT = process.env.PORT || 10000;
app.listen(PORT, () => {
  console.log(`✅ Servidor escuchando en el puerto ${PORT}`);
});
