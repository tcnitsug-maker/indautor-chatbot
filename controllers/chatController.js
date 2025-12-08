const Message = require("../models/Message");
const fetch = require("node-fetch");

exports.sendChat = async (req, res) => {
  try {
    const userMessage = req.body.message;

    await Message.create({ role: "user", text: userMessage });

    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${process.env.GEMINI_API_KEY}`;

    const body = {
      contents: [{ parts: [{ text: userMessage }] }]
    };

    const response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

    const data = await response.json();
    const reply = data.candidates?.[0]?.content?.parts?.[0]?.text || "Sin respuesta.";

    await Message.create({ role: "bot", text: reply });

    res.json({ reply });
  } catch (error) {
    res.status(500).json({ reply: "Error en el servidor." });
  }
};
