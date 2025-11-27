import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import OpenAI from "openai";

dotenv.config();

const app = express();

app.use(
  cors({
    origin: "*", // si quieres, luego lo cierras a ["https://utneza.store"]
  })
);
app.use(express.json());

const client = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

const SYSTEM_PROMPT = `
Eres el agente de soporte oficial de un demo del área de INDAUTOR.
Respondes en español, con tono profesional pero amable.
Das información general y orientativa, sin efectos legales ni oficiales.
Si el usuario pide algo oficial, dile que consulte directamente con INDAUTOR.
`;

app.post("/chat", async (req, res) => {
  try {
    const { message, history = [] } = req.body;

    if (!message) {
      return res.status(400).json({ error: "Falta 'message' en el cuerpo de la petición." });
    }

    const response = await client.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        ...history,
        { role: "user", content: message },
      ],
    });

    const reply = response.choices[0].message.content;

    res.json({
      reply,
      history: [
        ...history,
        { role: "user", content: message },
        { role: "assistant", content: reply },
      ],
    });
  } catch (error) {
    console.error("Error en /chat:", error);
    res.status(500).json({ error: "Error interno en el servidor" });
  }
});

const PORT = process.env.PORT || 10000;
app.listen(PORT, () => {
  console.log(`Servidor escuchando en el puerto ${PORT}`);
});
