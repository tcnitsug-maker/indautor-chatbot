const Message = require("../models/Message");
const BlockedIP = require("../models/BlockedIP");
const Setting = require("../models/Setting");
const CustomReply = require("../models/CustomReply");
const fetch = require("node-fetch");

const OPENAI_MODEL = process.env.OPENAI_MODEL || "gpt-4o-mini";
const GEMINI_MODEL = process.env.GEMINI_MODEL || "gemini-2.0-flash";

const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

/* =========================================================
   🔧 NORMALIZACIÓN
========================================================= */
function stripAccents(s = "") {
  return s.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
}
function norm(s = "") {
  return stripAccents(String(s).toLowerCase())
    .replace(/[^a-z0-9ñ\s]/gi, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/* =========================================================
   ⚙️ SETTINGS IA
========================================================= */
async function getSetting(key, fallback = null) {
  const doc = await Setting.findOne({ key }).lean();
  return doc ? doc.value : fallback;
}
async function setSetting(key, value) {
  await Setting.findOneAndUpdate(
    { key },
    { value, updatedAt: new Date() },
    { upsert: true }
  );
}
async function askAIWithFallback(msg) {
  const turn = await getSetting("ai_turn", "gemini");
  const first = turn === "gemini" ? "gemini" : "openai";
  const second = first === "gemini" ? "openai" : "gemini";

  // Guardamos el siguiente turno para alternar
  await setSetting("ai_turn", second);

  // 1️⃣ INTENTO PRINCIPAL
  try {
    if (first === "gemini") {
      const reply = await askGemini(msg);
      if (reply) return { reply, source: "gemini" };
    } else {
      const reply = await askOpenAI(msg);
      if (reply) return { reply, source: "openai" };
    }
  } catch (e) {
    console.warn(`⚠️ ${first} falló, intentando fallback...`);
  }

  // 2️⃣ FALLBACK AUTOMÁTICO
  try {
    if (second === "gemini") {
      const reply = await askGemini(msg);
      if (reply) return { reply, source: "gemini" };
    } else {
      const reply = await askOpenAI(msg);
      if (reply) return { reply, source: "openai" };
    }
  } catch (e) {
    console.error("❌ Ambas IA fallaron");
  }

  // 3️⃣ SI AMBAS FALLAN
  return {
    reply: "En este momento nuestros servicios de inteligencia artificial no están disponibles. Intenta nuevamente más tarde.",
    source: "unavailable"
  };
}


/* =========================================================
   ⭐ MATCHING FUZZY (CUSTOM REPLIES)
========================================================= */
function tokens(s = "") {
  return norm(s).split(" ").filter(Boolean);
}
function jaccard(a, b) {
  const A = new Set(a), B = new Set(b);
  let i = 0;
  for (const x of A) if (B.has(x)) i++;
  return i / (A.size + B.size - i || 1);
}
function levenshtein(a, b) {
  a = norm(a); b = norm(b);
  const m = a.length, n = b.length;
  const d = Array.from({ length: m + 1 }, () => Array(n + 1).fill(0));
  for (let i = 0; i <= m; i++) d[i][0] = i;
  for (let j = 0; j <= n; j++) d[0][j] = j;
  for (let i = 1; i <= m; i++)
    for (let j = 1; j <= n; j++)
      d[i][j] = Math.min(
        d[i - 1][j] + 1,
        d[i][j - 1] + 1,
        d[i - 1][j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1)
      );
  return d[m][n];
}
function similarity(a, b) {
  if (!a || !b) return 0;
  return (
    0.6 * jaccard(tokens(a), tokens(b)) +
    0.4 * (1 - levenshtein(a, b) / Math.max(a.length, b.length, 1))
  );
}

async function findCustomReply(userMsg) {
  const list = await CustomReply.find({ enabled: true })
    .sort({ priority: -1, updatedAt: -1 })
    .lean();

  let best = null;
  let bestScore = 0;

  for (const r of list) {
    const trigger = r.trigger || r.question || "";
    const score = similarity(norm(userMsg), norm(trigger));
    if (score > bestScore) {
      bestScore = score;
      best = r;
    }
  }

  if (best && bestScore >= 0.78) {
    return {
      reply: best.response || best.answer || "",
      type: best.type || "text",
      videoUrl: best.videoUrl || null,
      source: "custom",
      score: Number(bestScore.toFixed(3))
    };
  }

  return null;
}

/* =========================================================
   🤖 IA
========================================================= */
async function askOpenAI(msg) {
  const r = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${OPENAI_API_KEY}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      model: OPENAI_MODEL,
      temperature: 0.2,
      messages: [
        { role: "system", content: "Asistente institucional INDARELÍN / INDAUTOR." },
        { role: "user", content: msg }
      ]
    })
  });
  const d = await r.json();
  return d?.choices?.[0]?.message?.content?.trim();
}

async function askGemini(msg) {
  const r = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${GEMINI_API_KEY}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ parts: [{ text: msg }] }]
      })
    }
  );
  const d = await r.json();
  return d?.candidates?.[0]?.content?.parts?.map(p => p.text).join(" ");
}

async function askAIAlternating(msg) {
  const turn = await getSetting("ai_turn", "gemini");
  await setSetting("ai_turn", turn === "gemini" ? "openai" : "gemini");
  try {
    return {
      reply: turn === "gemini" ? await askGemini(msg) : await askOpenAI(msg),
      source: turn
    };
  } catch {
    return {
      reply: "Servicio temporalmente no disponible.",
      source: "fallback"
    };
  }
}

// =============================
// CHAT PRINCIPAL
// =============================
exports.sendChat = async (req, res) => {
  try {
    const ip =
      req.headers["x-forwarded-for"]?.split(",")[0] ||
      req.socket.remoteAddress;

    const userMsg = String(req.body?.message || "").trim();
    if (!userMsg) {
      return res.status(400).json({ reply: "Falta el mensaje." });
    }

    const blocked = await BlockedIP.findOne({ ip, active: true }).lean();
    if (blocked) {
      return res.status(403).json({
        reply: "Acceso restringido. Contacte al administrador."
      });
    }

    await Message.create({
      role: "user",
      text: userMsg,
      ip,
      source: "user"
    });

    // 1️⃣ RESPUESTAS PERSONALIZADAS (PRIORIDAD)
    const custom = await findCustomReply(userMsg);
    if (custom) {
      const videoUrl = getVideoForReply(custom.reply);
      await Message.create({
        role: "bot",
        text: custom.reply,
        ip,
        source: "custom"
      });
      return res.json({
        reply: custom.reply,
        source: "custom",
        matchScore: custom.matchScore,
        videoUrl
      });
    }

    // 2️⃣ IA CON FALLBACK AUTOMÁTICO
    const ai = await askAIWithFallback(userMsg);
    const videoUrl = getVideoForReply(ai.reply);

    await Message.create({
      role: "bot",
      text: ai.reply,
      ip,
      source: ai.source
    });

    return res.json({
      reply: ai.reply,
      source: ai.source,
      videoUrl
    });

  } catch (err) {
    console.error("CHAT ERROR:", err);
    return res.status(500).json({
      reply: "Estamos experimentando un problema técnico. Intenta nuevamente."
    });
  }
};
