const Message = require("../models/Message");
const CustomReply = require("../models/CustomReply");
const fetch = require("node-fetch");

const OPENAI_API_URL = "https://api.openai.com/v1/chat/completions";
const OPENAI_MODEL = "gpt-4o-mini";

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const GEMINI_MODEL = process.env.GEMINI_MODEL || "gemini-1.5-flash";

let useGemini = true; // true = Gemini, false = OpenAI

function normalizeText(text) {
  return (text || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim();
}

async function findCustomReply(userText) {
  const normUser = normalizeText(userText);
  const replies = await CustomReply.find({ enabled: true });

  for (const r of replies) {
    const nq = normalizeText(r.question);
    if (normUser.includes(nq) || nq.includes(normUser)) {
      return r.answer;
    }
    if (Array.isArray(r.keywords)) {
      for (const kw of r.keywords) {
        const nk = normalizeText(kw);
        if (nk && normUser.includes(nk)) {
          return r.answer;
        }
      }
    }
  }
  return null;
}

async function callOpenAI(messages) {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    console.warn("Falta OPENAI_API_KEY");
    return "Por el momento no puedo consultar OpenAI (falta API key).";
  }

  const res = await fetch(OPENAI_API_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: OPENAI_MODEL,
      messages,
    }),
  });

  if (!res.ok) {
    console.error("Error OpenAI:", await res.text());
    return "Hubo un problema consultando OpenAI.";
  }

  const data = await res.json();
  return (
    data.choices?.[0]?.message?.content?.trim() ||
    "No obtuve respuesta de OpenAI."
  );
}

async function callGemini(messages) {
  if (!GEMINI_API_KEY) {
    console.warn("Falta GEMINI_API_KEY");
    return "Por el momento no puedo consultar Gemini (falta API key).";
  }

  const promptText = messages
    .map((m) => `${m.role === "user" ? "Usuario" : "Sistema"}: ${m.content}`)
    .join("\n");

  const url = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${GEMINI_API_KEY}`;

  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      contents: [
        {
          role: "user",
          parts: [{ text: promptText }],
        },
      ],
    }),
  });

  if (!res.ok) {
    console.error("Error Gemini:", await res.text());
    return "Hubo un problema consultando Gemini.";
  }

  const data = await res.json();
  const text =
    data.candidates?.[0]?.content?.parts?.[0]?.text?.trim() ||
    "No obtuve respuesta de Gemini.";
  return text;
}

exports.sendChat = async (req, res) => {
  try {
    const userMessage = (req.body && req.body.message) || "";

    if (!userMessage.trim()) {
      return res.status(400).json({ reply: "Debes escribir un mensaje." });
    }

    // Guardar mensaje de usuario
    await Message.create({ role: "user", text: userMessage });

    // 1️⃣ Revisar respuestas personalizadas primero
    const custom = await findCustomReply(userMessage);
    if (custom) {
      await Message.create({ role: "bot", text: custom });
      return res.json({ reply: custom, source: "custom" });
    }

    // 2️⃣ Si no hay respuesta personalizada, llamar IA
    const messages = [
      {
        role: "system",
        content:
          "Eres el asistente INDARELÍN. Responde de forma clara, respetuosa y útil. Si la pregunta es legal, responde de forma informativa (no das asesoría formal).",
      },
      { role: "user", content: userMessage },
    ];

    let reply;
    let source;

    if (useGemini) {
      reply = await callGemini(messages);
      source = "gemini";
    } else {
      reply = await callOpenAI(messages);
      source = "openai";
    }

    // Alternar para la próxima vez
    useGemini = !useGemini;

    await Message.create({ role: "bot", text: reply });

    res.json({ reply, source });
  } catch (error) {
    console.error("Error en sendChat:", error);
    res.status(500).json({ reply: "Error en el servidor." });
  }
};
