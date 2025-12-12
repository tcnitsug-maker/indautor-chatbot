// ---------------------------------------------------------------------------
// IMPORTS Y CONFIGURACIONES INICIALES
// ---------------------------------------------------------------------------
const Message = require("../models/Message");
const CustomReply = require("../models/CustomReply");
const fetch = require("node-fetch");

const OPENAI_MODEL = process.env.OPENAI_MODEL || "gpt-4o-mini";
const GEMINI_MODEL = process.env.GEMINI_MODEL || "gemini-2.0-flash";

const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

// ---------------------------------------------------------------------------
// CONFIGURACIÓN ANTI-SPAM / ANTI-FLOOD
// ---------------------------------------------------------------------------
const FLOOD_MIN_DELAY = 3000;       // 3 segundos mínimo entre mensajes
const FLOOD_MAX_BURST = 4;          // máximo 4 mensajes rápidos
const FLOOD_BLOCK_TIME = 10000;     // 10 segundos de bloqueo

const floodMap = new Map(); // { ip: { lastTime, count, blockedUntil } }

// Función para controlar SPAM por IP
function checkFlood(ip) {
  const now = Date.now();

  if (!floodMap.has(ip)) {
    floodMap.set(ip, { lastTime: 0, count: 0, blockedUntil: 0 });
  }

  const data = floodMap.get(ip);

  // Si está bloqueado
  if (now < data.blockedUntil) {
    return { blocked: true, wait: data.blockedUntil - now };
  }

  const diff = now - data.lastTime;

  // Mensajes demasiado rápidos
  if (diff < FLOOD_MIN_DELAY) {
    data.count++;
    if (data.count >= FLOOD_MAX_BURST) {
      data.blockedUntil = now + FLOOD_BLOCK_TIME;
      data.count = 0;
      return { blocked: true, wait: FLOOD_BLOCK_TIME };
    }
  } else {
    data.count = 0;
  }

  data.lastTime = now;
  floodMap.set(ip, data);
  return { blocked: false };
}

// ---------------------------------------------------------------------------
// NORMALIZACIÓN DE TEXTO PARA RESPUESTAS PERSONALIZADAS
// ---------------------------------------------------------------------------
function normalize(text) {
  return (text || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim();
}

// ---------------------------------------------------------------------------
// RESPUESTAS PERSONALIZADAS
// ---------------------------------------------------------------------------
async function findCustomReply(userText) {
  const normUser = normalize(userText);
  const replies = await CustomReply.find({ enabled: true });

  for (const r of replies) {
    const nq = normalize(r.question);

    // Coincidencia exacta o parcial
    if (normUser.includes(nq) || nq.includes(normUser)) {
      return r.answer;
    }

    // Coincidencia por keywords
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

// ---------------------------------------------------------------------------
// CONEXIÓN OPENAI — OPTIMIZADA
// ---------------------------------------------------------------------------
async function callOpenAI(messages) {
  if (!OPENAI_API_KEY) {
    console.warn("⚠ Falta OPENAI_API_KEY");
    return null;
  }

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
        max_tokens: 350,
        temperature: 0.7,
      }),
    });

    if (!res.ok) {
      console.error("❌ OpenAI Error:", await res.text());
      return null;
    }

    const data = await res.json();
    return data.choices?.[0]?.message?.content?.trim() || null;

  } catch (err) {
    console.error("❌ Error llamando OpenAI:", err);
    return null;
  }
}

// ---------------------------------------------------------------------------
// CONEXIÓN GEMINI — OPTIMIZADA
// ---------------------------------------------------------------------------
async function callGemini(messages) {
  if (!GEMINI_API_KEY) {
    console.warn("⚠ Falta GEMINI_API_KEY");
    return null;
  }

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
          maxOutputTokens: 350,
          temperature: 0.7,
        },
      }),
    });

    if (!res.ok) {
      console.error("❌ Gemini Error:", await res.text());
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

// ---------------------------------------------------------------------------
// CONTROLADOR PRINCIPAL — OPTIMIZADO, CON FLOOD + IA + FALLBACK
// ---------------------------------------------------------------------------
exports.sendChat = async (req, res) => {
  try {
    const ip = req.headers["x-forwarded-for"]?.split(",")[0] || req.ip;

    // 1️⃣ ANTI-SPAM
    const flood = checkFlood(ip);
    if (flood.blocked) {
      const sec = Math.ceil(flood.wait / 1000);
      return res.json({
        reply: `Demasiados mensajes enviados. Por favor espera ${sec} segundos.`,
        source: "flood-protection",
      });
    }

    // 2️⃣ VALIDAR MENSAJE
    const userMessage = req.body?.message?.trim();
    if (!userMessage) {
      return res.status(400).json({ reply: "Debes escribir un mensaje." });
    }

    await Message.create({ role: "user", text: userMessage, ip });

    // 3️⃣ RESPUESTAS PERSONALIZADAS
    const custom = await findCustomReply(userMessage);
    if (custom) {
      await Message.create({ role: "bot", text: custom, source: "custom" });
      return res.json({ reply: custom, source: "custom" });
    }

    // 4️⃣ PROMPT GENERAL
    const messages = [
      {
        role: "system",
        content:
          "Eres el asistente INDARELÍN. Responde claro, respetuoso y útil. No das asesoría legal formal; solo informas.",
      },
      { role: "user", content: userMessage },
    ];

    let reply = null;

    // 5️⃣ INTENTAR GEMINI (2 INTENTOS)
    reply = await callGemini(messages);
    if (!reply) reply = await callGemini(messages);

    if (reply) {
      await Message.create({ role: "bot", text: reply, source: "gemini" });
      return res.json({ reply, source: "gemini" });
    }

    // 6️⃣ INTENTAR OPENAI (2 INTENTOS)
    reply = await callOpenAI(messages);
    if (!reply) reply = await callOpenAI(messages);

    if (reply) {
      await Message.create({ role: "bot", text: reply, source: "openai" });
      return res.json({ reply, source: "openai" });
    }

    // 7️⃣ FALLBACK
    reply =
      "En este momento estamos experimentando alta demanda. Por favor intenta más tarde.";

    await Message.create({ role: "bot", text: reply, source: "fallback" });
    res.json({ reply, source: "fallback" });

  } catch (error) {
    console.error("❌ Error en sendChat:", error);
    res.status(500).json({
      reply:
        "Estamos experimentando un problema técnico. Intenta nuevamente en unos minutos.",
    });
  }
};
