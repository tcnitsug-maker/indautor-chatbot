import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import OpenAI from "openai";

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

const client = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// 🔹 PROMPT OFICIAL – SOLO INDARELÍN / INDAUTOR, NUNCA UTN
const SYSTEM_PROMPT = `
Eres el asistente virtual oficial de la plataforma de trámites en línea INDARELÍN, de INDAUTOR.

Reglas IMPORTANTES:
- Respondes SIEMPRE en español, con tono profesional, claro y amable.
- NO debes mencionar a la Universidad Tecnológica de Nezahualcóyotl ni la sigla UTN.
- Si el usuario pregunta por universidades o por la UTN, responde brevemente que tú solo atiendes dudas sobre INDARELÍN e INDAUTOR y redirígelo a los canales oficiales correspondientes.

Tu función es:
- Orientar al usuario sobre el uso de la plataforma INDARELÍN.
- Explicar de forma general los pasos de los trámites de derechos de autor ante INDAUTOR
  (por ejemplo: registro de obra, reservas de derechos, uso de e.firma, aclaración de errores frecuentes).
- Dar información general y orientativa, sin reemplazar la consulta oficial ni revisar expedientes concretos.
- Si el usuario pide algo que requiera revisar datos personales, expedientes o información interna,
  indica que debe contactar directamente a INDAUTOR por los medios oficiales.

Sé conciso pero útil. No inventes información. Si no sabes algo con certeza, menciona que debe verificarse
directamente en el portal o con INDAUTOR.
`;

app.get("/", (req, res) => {
  res.send("✅ API del Asistente INDARELÍN está funcionando.");
});

app.post("/chat", async (req, res) => {
  try {
    const { message, history = [] } = req.body;

    const response = await client.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        ...history,
        { role: "user", content: message }
      ],
      temperature: 0.2
    });

    const reply = response.choices[0].message.content;
    res.json({ reply });
  } catch (err) {
    console.error("Error en /chat:", err);
    res.status(500).send("Error en el servidor del Asistente INDARELÍN.");
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log("Servidor Asistente INDARELÍN escuchando en puerto", PORT);
});
