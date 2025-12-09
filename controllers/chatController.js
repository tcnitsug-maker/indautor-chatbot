const Message = require("../models/Message");
const fetch = require("node-fetch");

exports.sendChat = async (req, res) => {
  try {
    const userMessage = req.body.message;

    if (!userMessage || typeof userMessage !== "string") {
      return res.status(400).json({ reply: "Mensaje inválido" });
    }

    await Message.create({ role: "user", text: userMessage });

    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${process.env.GEMINI_API_KEY}`;

    const body = {
      contents: [{ parts: [{ text: userMessage }] }]
    };

    const response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body)
    });

    if (!response.ok) {
      console.error("Error en Gemini:", await response.text());
      return res.json({ reply: "El modelo no pudo responder." });
    }

    const data = await response.json();
    const reply =
      data.candidates?.[0]?.content?.parts?.[0]?.text ||
      "No tengo una respuesta en este momento.";

    await Message.create({ role: "bot", text: reply });

    res.json({ reply });
  } catch (error) {
    console.error("Error en sendChat:", error);
    res.status(500).json({ reply: "Error en el servidor." });
  }
};
