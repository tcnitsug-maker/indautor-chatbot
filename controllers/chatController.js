const Message = require("../models/Message");
const fetch = require("node-fetch");

const OPENAI_API_URL = "https://api.openai.com/v1/chat/completions";
const OPENAI_MODEL = "gpt-4.1-mini";

exports.sendChat = async (req, res) => {
  try {
    const userMessage = req.body.message;

    if (!userMessage || typeof userMessage !== "string") {
      return res.status(400).json({ reply: "Mensaje inválido" });
    }

    // Guardar mensaje
    await Message.create({ role: "user", text: userMessage });

    const body = {
      model: OPENAI_MODEL,
      messages: [
        {
          role: "system",
          content: "Eres INDARELÍN, un asistente legal y administrativo en español. Responde de forma clara y útil."
        },
        {
          role: "user",
          content: userMessage
        }
      ]
    };

    const response = await fetch(OPENAI_API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${process.env.OPENAI_API_KEY}`
      },
      body: JSON.stringify(body)
    });

    const data = await response.json();

    if (!response.ok) {
      console.error("Error OpenAI:", data);
      return res.json({ reply: "Error consultando OpenAI." });
    }

    // Texto de respuesta
    const reply = data.choices?.[0]?.message?.content || "No tengo respuesta.";

    await Message.create({ role: "bot", text: reply });

    res.json({ reply });

  } catch (error) {
    console.error("Error en sendChat:", error);
    res.status(500).json({ reply: "Error en el servidor." });
  }
};
