//-----------------------------------------------------------------------
// CONTROLADOR DE CHAT — VERSIÓN OPTIMIZADA PROFESIONAL
//-----------------------------------------------------------------------

const Message = require("../models/Message");
const CustomReply = require("../models/CustomReply");
const fetch = require("node-fetch");

const OPENAI_MODEL = process.env.OPENAI_MODEL || "gpt-4o-mini";
const GEMINI_MODEL = process.env.GEMINI_MODEL || "gemini-2.0-flash";

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const OPENAI_API_KEY = process.env.OPENAI_API_KEY;

//-----------------------------------------------------------------------
// NORMALIZAR TEXTO PARA BÚSQUEDAS
//-----------------------------------------------------------------------
function normalize(text) {
  return (text || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim();
}

//-----------------------------------------------------------------------
// RESPUESTAS PERSONALIZADAS
//-----------------------------------------------------------------------
async function findCustomReply(userText) {
  const normUser = normalize(userText);
  const replies = await CustomReply.find({ enabled: true });

  for (const r of replies) {
    const nq = normalize(r.question);

    // Coincidencia exacta o parcial
    if (normUser.includes(nq) || nq.includes(normUser)) {
      return r.answer;
    }

    // Coincidencia con keywords
    if (Array.isArray(r.keywords)) {
      for (const kw of r.keywords) {
        const nk = normalize(kw);
        if (nk && normUser.includes(nk)) {
          return r.answer;
        }
      }
    }
  }
  return null;
}

//-----------------------------------------------------------------------
// CALL OPENAI CON OPTIMIZACIÓN
//-----------------------------------------------------------------------
async function callOpenAI(messages) {
  if (!OPENAI_API_KEY) return null;

  try {
    const res = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${OPENAI_API_KEY}`,
      },
      body: JSON.stringify({
        model: OPENAI_MODEL,
        messages,
        max_tokens: 400,
        temperature: 0.7,
      }),
    });

    if (!res.ok) {
      console.error("❌ OpenAI error:", await res.text());
      return null;
    }

    const data = await res.json();
    return data.choices?.[0]?.message?.content?.trim() || null;

  } catch (err) {
    console.error("❌ Error llamando OpenAI:", err);
    return null;
  }
}

//-----------------------------------------------------------------------
// CALL GEMINI CON OPTIMIZACIÓN
//-----------------------------------------------------------------------
async function callGemini(messages) {
  if (!GEMINI_API_KEY) return null;

  try {
    const prompt = messages
      .map((m) => `${m.role === "user" ? "Usuario" : "Sistema"}: ${m.content}`)
      .join("\n");

    const url = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${GEMINI_API_KEY}`;

    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ role: "user", parts: [{ text: prompt }] }],
        generationConfig: {
          maxOutputTokens: 400,
          temperature: 0.7,
        },
      }),
    });

    if (!res.ok) {
      console.error("❌ Gemini error:", await res.text());
      return null;
    }

    const data = await res.json();
    const text = data?.candidates?.[0]?.content?.parts?.[0]?.text?.trim();
    return text || null;

  } catch (err) {
    console.error("❌ Error llamando Gemini:", err);
    return null;
  }
}

//-----------------------------------------------------------------------
// FUNCIÓN CENTRAL OPTIMIZADA
//-----------------------------------------------------------------------
exports.sendChat = async (req, res) => {
  try {
    const userMessage = req.body?.message?.trim();
    if (!userMessage) {
      return res.status(400).json({ reply: "Debes escribir un mensaje." });
    }

    // Guardar mensaje del usuario
    await Message.create({ role: "user", text: userMessage });

    //-------------------------------------------------------------------
    // 1️⃣ REVISAR RESPUESTAS PERSONALIZADAS
    //-------------------------------------------------------------------
    const custom = await findCustomReply(userMessage);
    if (custom) {
      await Message.create({ role: "bot", text: custom, source: "custom" });
      return res.json({ reply: custom, source: "custom" });
    }

    //-------------------------------------------------------------------
    // 2️⃣ CONTRUIR PROMPT
    //-------------------------------------------------------------------
    const messages = [
      {
        role: "system",
        content:
          "Eres el asistente INDARELÍN. Responde de forma clara, respetuosa y útil. No das asesoría legal formal; solo informas.",
      },
      { role: "user", content: userMessage },
    ];

    //-------------------------------------------------------------------
    // 3️⃣ INTENTAR GEMINI (2 reintentos)
    //-------------------------------------------------------------------
    let reply = await callGemini(messages);
    if (!reply) reply = await callGemini(messages);

    if (reply) {
      await Message.create({ role: "bot", text: reply, source: "gemini" });
      return res.json({ reply, source: "gemini" });
    }

    //-------------------------------------------------------------------
    // 4️⃣ SI FALLA → INTENTAR OPENAI (2 reintentos)
    //-------------------------------------------------------------------
    reply = await callOpenAI(messages);
    if (!reply) reply = await callOpenAI(messages);

    if (reply) {
      await Message.create({ role: "bot", text: reply, source: "openai" });
      return res.json({ reply, source: "openai" });
    }

    //-------------------------------------------------------------------
    // 5️⃣ SI AMBOS FALLAN → FALLBACK
    //-------------------------------------------------------------------
    reply =
      "En este momento estamos experimentando alta demanda. Por favor intenta nuevamente en unos minutos.";

    await Message.create({ role: "bot", text: reply, source: "fallback" });

    res.json({ reply, source: "fallback" });

  } catch (error) {
    console.error("❌ Error grave en sendChat:", error);
    res.status(500).json({
      reply:
        "Estamos experimentando un problema técnico. Por favor intenta más tarde.",
    });
  }
};
