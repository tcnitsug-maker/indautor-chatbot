const Message = require("../models/Message");
const CustomReply = require("../models/CustomReply");
const fetch = require("node-fetch");

const OPENAI_MODEL = process.env.OPENAI_MODEL || "gpt-4o-mini";
const GEMINI_MODEL = process.env.GEMINI_MODEL || "gemini-2.0-flash";
const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

// ----------------------
// Anti-flood
// ----------------------
const FLOOD_MIN_DELAY = 3000;
const FLOOD_MAX_BURST = 4;
const FLOOD_BLOCK_TIME = 10000;

const floodMap = new Map(); // ip -> { lastTime, count, blockedUntil }

function checkFlood(ip) {
  const now = Date.now();

  if (!floodMap.has(ip)) {
    floodMap.set(ip, { lastTime: 0, count: 0, blockedUntil: 0 });
  }

  const data = floodMap.get(ip);

  if (now < data.blockedUntil) {
    return { blocked: true, wait: data.blockedUntil - now };
  }

  const diff = now - data.lastTime;

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

// ----------------------
// Custom replies
// ----------------------
function normalize(text) {
  return (text || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim();
}

async function findCustomReply(userText) {
  const normUser = normalize(userText);
  const replies = await CustomReply.find({ enabled: true }).sort({ priority: -1, createdAt: -1 });

  for (const r of replies) {
    const trig = r.trigger || r.question || "";
    const nq = normalize(trig);
    if (nq && (normUser.includes(nq) || nq.includes(normUser))) {
      return {
        type: r.type || "text",
        reply: r.response || r.answer || "",
        video_url: r.video_url || "",
        video_file: r.video_file || "",
        video_name: r.video_name || ""
      };
    }

    if (Array.isArray(r.keywords)) {
      for (const kw of r.keywords) {
        const nk = normalize(kw);
        if (nk && normUser.includes(nk)) {
          return {
            type: r.type || "text",
            reply: r.response || r.answer || "",
            video_url: r.video_url || "",
            video_file: r.video_file || "",
            video_name: r.video_name || ""
          };
        }
      }
    }
  }
  return null;
}

// ----------------------
// OpenAI
// ----------------------
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
        max_tokens: 350,
        temperature: 0.7,
      }),
    });

    if (!res.ok) return null;
    const data = await res.json();
    return data.choices?.[0]?.message?.content?.trim() || null;
  } catch {
    return null;
  }
}

// ----------------------
// Gemini
// ----------------------
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
        generationConfig: { maxOutputTokens: 350, temperature: 0.7 },
      }),
    });

    if (!res.ok) return null;

    const data = await res.json();
    return data?.candidates?.[0]?.content?.parts?.[0]?.text?.trim() || null;
  } catch {
    return null;
  }
}

// ----------------------
// CONTROLLER
// ----------------------
exports.sendChat = async (req, res) => {
  const io = req.app?.locals?.io;

  try {
    const ip = req.headers["x-forwarded-for"]?.split(",")[0]?.trim() || req.ip || "unknown";

    // Anti-flood
    const flood = checkFlood(ip);
    if (flood.blocked) {
      const sec = Math.ceil(flood.wait / 1000);

      // 🔴 ALERTA EN VIVO AL PANEL
      io?.emit("spam_alert", {
        ip,
        reason: "FLOOD",
        waitMs: flood.wait,
        at: new Date().toISOString(),
      });

      return res.json({
        reply: `Demasiados mensajes enviados. Por favor espera ${sec} segundos.`,
        source: "flood-protection",
      });
    }

    const userMessage = req.body?.message?.trim();
    if (!userMessage) return res.status(400).json({ reply: "Debes escribir un mensaje." });

    // Guardar USER
    const userDoc = await Message.create({ role: "user", text: userMessage, ip });
    io?.emit("new_message", userDoc);

    // Custom reply
    const custom = await findCustomReply(userMessage);
    if (custom) {
      const botDoc = await Message.create({ role: "bot", text: custom, ip, source: "custom" });
      io?.emit("new_message", botDoc);
      return res.json({ reply: custom.reply, source: "custom", type: custom.type || "text", video_url: custom.video_url || custom.video_file || "" });
    }

    const messages = [
      { role: "system", content: "Eres el asistente INDARELÍN. Responde claro, respetuoso y útil." },
      { role: "user", content: userMessage },
    ];

    // Gemini -> OpenAI fallback
    let reply = await callGemini(messages);
    let source = "gemini";

    if (!reply) {
      reply = await callOpenAI(messages);
      source = "openai";
    }

    if (!reply) {
      reply = "En este momento estamos experimentando alta demanda. Por favor intenta más tarde.";
      source = "fallback";
    }

    // Guardar BOT
    const botDoc = await Message.create({ role: "bot", text: reply, ip, source });
    io?.emit("new_message", botDoc);

    return res.json({ reply, source });
  } catch (error) {
    console.error("Error en sendChat:", error);
    return res.status(500).json({
      reply: "Estamos experimentando un problema técnico. Intenta nuevamente en unos minutos.",
    });
  }
};
