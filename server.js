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

// 🔹 PROMPT BILINGÜE + NÁHUATL
const SYSTEM_PROMPT = `
You are the official support agent for the website utneza.store.

Your tasks:
- Help users navigate the site.
- Explain content related to Universidad Tecnológica de Nezahualcóyotl.
- Answer general questions about the projects or sections of the site.
- Always be respectful and clear.

LANGUAGE RULES (VERY IMPORTANT):
- If the user writes in Spanish and does NOT say anything about language, answer in Spanish.
- If the user writes in English, answer in English.
- If the user writes in Spanish but says "in English" or "en inglés", answer in English.
- If the user asks "in Nahuatl", "en náhuatl" or "nāhuatl", answer in Classical Nahuatl (Central Nahuatl).
- If the user asks for both English and Nahuatl, answer first in English and then add a second part labeled:
  "Nahuatl: <translation in Classical Nahuatl>".

Always follow these language rules exactly.
`;

app.post("/chat", async (req, res) => {
  try {
    const { message, history = [] } = req.body;

    const response = await client.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        ...history,
        { role: "user", content: message },
      ],
    });

    const reply = response.choices[0].message.content;
    res.json({ reply });
  } catch (error) {
    console.error("Error en /chat:", error);
    res.status(500).json({ error: "Error en el servidor de chat" });
  }
});

// Puerto para Render (usa PORT o 3000)
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Servidor de chat escuchando en el puerto ${PORT}`);
});
