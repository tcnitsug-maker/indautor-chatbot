const Message = require("../models/Message");
const fetch = require("node-fetch");

// Usa OpenAI API (model económico gpt-4.1-mini)
const OPENAI_API_URL = "https://api.openai.com/v1/chat/completions";
const OPENAI_MODEL = process.env.OPENAI_MODEL || "gpt-4.1-mini";

exports.sendChat = async (req, res) => {
  try {
    const userMessage = req.body.message;

    if (!userMessage || typeof userMessage !== "string") {
      return res.status(400).json({ reply: "Mensaje inválido" });
    }

    // Guardar mensaje del usuario
    await Message.create({ role: "user", text: userMessage });

    const body = {
      model: OPENAI_MODEL,
      messages: [
        {
          role: "system",
          content: "Eres INDARELÍN, un asistente legal y administrativo en español. Responde de forma clara, breve y útil."
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

    if (!response.ok) {
      const errText = await response.text();
      console.error("Error en OpenAI:", errText);
      return res.json({ reply: "El modelo no pudo responder en este momento." });
    }

    const data = await response.json();
    const reply =
      data.choices?.[0]?.message?.content ||
      "No tengo una respuesta en este momento.";

    // Guardar respuesta del bot
    await Message.create({ role: "bot", text: reply });

    res.json({ reply });
  } catch (error) {
    console.error("Error en sendChat:", error);
    res.status(500).json({ reply: "Error en el servidor." });
  }
};
