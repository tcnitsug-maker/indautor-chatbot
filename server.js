import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import OpenAI from "openai";

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

// Servir los archivos de /public
app.use(express.static("public"));

// Cliente OpenAI
const client = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// PROMPT BASE
const BASE_SYSTEM_PROMPT = `
Eres el asistente virtual informativo del Instituto Nacional del Derecho de Autor (INDAUTOR),
órgano administrativo desconcentrado de la Secretaría de Cultura encargado de proteger y fomentar
los derechos de autor en México.

Hablas SIEMPRE en español, con tono institucional y claro.
(No das asesoría jurídica personalizada ni interpretas casos concretos.)
`;

let currentSystemPrompt = BASE_SYSTEM_PROMPT;

// ENDPOINT PRINCIPAL DEL CHATBOT
app.post("/chat", async (req, res) => {
  try {
    const { message, history = [] } = req.body;

    const response = await client.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        { role: "system", content: currentSystemPrompt },
        ...history,
        { role: "user", content: message }
      ]
    });

    res.json({ reply: response.choices[0].message.content });

  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Error en el servidor del chatbot" });
  }
});

// ADMIN: OBTENER CONFIG
app.get("/admin/config", (req, res) => {
  res.json({
    prompt: currentSystemPrompt,
    basePrompt: BASE_SYSTEM_PROMPT,
    model: "gpt-4o-mini"
  });
});

// ADMIN: ACTUALIZAR PROMPT
app.post("/admin/prompt", (req, res) => {
  const { prompt } = req.body;

  if (!prompt || typeof prompt !== "string") {
    return res.status(400).json({ error: "Prompt inválido" });
  }

  currentSystemPrompt = prompt;
  console.log("🟦 Prompt actualizado desde el panel administrativo");
  res.json({ ok: true });
});

// PUERTO
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log("🚀 Servidor INDAUTOR iniciado en puerto", PORT);
});
