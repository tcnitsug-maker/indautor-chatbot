const Message = require("../models/Message");
const BlockedIP = require("../models/BlockedIP");
const Setting = require("../models/Setting");
const CustomReply = require("../models/CustomReply");
const fetch = require("node-fetch");

/* =========================================================
   MODELOS / KEYS
========================================================= */
const OPENAI_MODEL = process.env.OPENAI_MODEL || "gpt-4o-mini";
const GEMINI_MODEL = process.env.GEMINI_MODEL || "gemini-2.0-flash";

const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

/* =========================================================
   HELPERS TEXTO
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
function tokens(s = "") {
  return norm(s).split(" ").filter(Boolean);
}
function jaccard(a, b) {
  const A = new Set(a), B = new Set(b);
  if (!A.size || !B.size) return 0;
  let inter = 0;
  for (const x of A) if (B.has(x)) inter++;
  return inter / (A.size + B.size - inter);
}
function levenshtein(a, b) {
  a = norm(a); b = norm(b);
  const m = a.length, n = b.length;
  const dp = Array.from({ length: m + 1 }, () => Array(n + 1).fill(0));
  for (let i = 0; i <= m; i++) dp[i][0] = i;
  for (let j = 0; j <= n; j++) dp[0][j] = j;
  for (let i = 1; i <= m; i++)
    for (let j = 1; j <= n; j++)
      dp[i][j] = Math.min(
        dp[i - 1][j] + 1,
        dp[i][j - 1] + 1,
        dp[i - 1][j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1)
      );
  return dp[m][n];
}
function similarity(a, b) {
  const na = norm(a), nb = norm(b);
  if (!na || !nb) return 0;
  if (na.includes(nb) || nb.includes(na)) return 0.92;
  return 0.55 * jaccard(tokens(na), tokens(nb)) +
         0.45 * (1 - levenshtein(na, nb) / Math.max(na.length, nb.length, 1));
}

/* =========================================================
   VIDEOS (PRIORITARIOS)
========================================================= */
function getVideoForReply(text = "") {
  const t = text.toLowerCase();
  if (t.includes("registr")) return "https://www.youtube.com/embed/NaDQ1HK4hjk";
  if (t.includes("desahogar")) return "https://www.youtube.com/embed/0-u1o0T4Hfs";
  if (t.includes("modifica")) return "https://www.youtube.com/embed/Zl_qTv9WJJk";
  if (t.includes("representantes")) return "https://www.youtube.com/embed/gnzDyWSwCQs";
  return null;
}

/* =========================================================
   SETTINGS (IA TURN)
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

/* =========================================================
   RESPUESTAS PERSONALIZADAS
========================================================= */
async function findCustomReply(userMsg) {
  const msg = norm(userMsg);
  const list = await CustomReply.find({ enabled: true })
    .sort({ priority: -1, updatedAt: -1 })
    .lean();

  let best = null, bestScore = 0;

  for (const r of list) {
    const score = similarity(msg, r.trigger || r.question || "");
    if (score > bestScore) {
      bestScore = score;
      best = r;
    }
  }

  if (best && bestScore >= 0.78) {
    return {
      reply: best.response || best.answer,
      source: "custom",
      matchScore: Number(bestScore.toFixed(3)),
      videoUrl: best.videoUrl || null
    };
  }
  return null;
}

/* =========================================================
   IA (OPENAI / GEMINI)
========================================================= */
async function askOpenAI(msg, history = [], lang = "es") {
  const messages = [
    {
      role: "system",
      content:
        lang === "en"
          ? "You are an institutional assistant for INDARELÍN / INDAUTOR. Be clear and concise."
          : "Eres un asistente institucional de INDARELÍN / INDAUTOR. Responde de forma clara y formal."
    },
    ...history,
    { role: "user", content: msg }
  ];

  const r = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${OPENAI_API_KEY}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      model: OPENAI_MODEL,
      temperature: 0.2,
      messages
    })
  });
  const data = await r.json();
  return data?.choices?.[0]?.message?.content?.trim();
}

async function askGemini(msg, history = [], lang = "es") {
  const context = history.map(h => h.content).join("\n");
  const prompt =
    (lang === "en"
      ? "You are an institutional assistant for INDARELÍN / INDAUTOR.\n"
      : "Eres un asistente institucional de INDARELÍN / INDAUTOR.\n") +
    (context ? `Context:\n${context}\n\n` : "") +
    msg;

  const r = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${GEMINI_API_KEY}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }]
      })
    }
  );
  const data = await r.json();
  return data?.candidates?.[0]?.content?.parts?.map(p => p.text).join(" ");
}

/* =========================================================
   IA CON FALLBACK AUTOMÁTICO
========================================================= */
async function askAIWithFallback(msg, history, lang) {
  const turn = await getSetting("ai_turn", "gemini");
  const first = turn === "gemini" ? "gemini" : "openai";
  const second = first === "gemini" ? "openai" : "gemini";

  await setSetting("ai_turn", second);

  try {
    if (first === "gemini") {
      const r = await askGemini(msg, history, lang);
      if (r) return { reply: r, source: "gemini" };
    } else {
      const r = await askOpenAI(msg, history, lang);
      if (r) return { reply: r, source: "openai" };
    }
  } catch {}

  try {
    if (second === "gemini") {
      const r = await askGemini(msg, history, lang);
      if (r) return { reply: r, source: "gemini" };
    } else {
      const r = await askOpenAI(msg, history, lang);
      if (r) return { reply: r, source: "openai" };
    }
  } catch {}

  return {
    reply:
      lang === "en"
        ? "AI services are temporarily unavailable. Please try again later."
        : "Los servicios de inteligencia artificial no están disponibles por el momento.",
    source: "unavailable"
  };
}

/* =========================================================
   ENDPOINT PRINCIPAL
========================================================= */
exports.sendChat = async (req, res) => {
  try {
    const ip =
      req.headers["x-forwarded-for"]?.split(",")[0] ||
      req.socket.remoteAddress;

    const userMsg = String(req.body?.message || "").trim();
    const lang = req.body?.lang === "en" ? "en" : "es";
    const history = Array.isArray(req.body?.history) ? req.body.history.slice(-12) : [];

    if (!userMsg) {
      return res.status(400).json({ reply: "Falta el mensaje." });
    }

    const blocked = await BlockedIP.findOne({ ip, active: true }).lean();
    if (blocked) {
      return res.status(403).json({
        reply:
          lang === "en"
            ? "Access restricted. Please contact the administrator."
            : "Acceso restringido. Contacte al administrador."
      });
    }

    await Message.create({ role: "user", text: userMsg, ip, source: "user" });

    // 1️⃣ PRIORIDAD: RESPUESTAS PERSONALIZADAS
    const custom = await findCustomReply(userMsg);
    if (custom) {
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
        videoUrl: custom.videoUrl || getVideoForReply(custom.reply)
      });
    }

    // 2️⃣ IA CON MEMORIA + FALLBACK
    const ai = await askAIWithFallback(userMsg, history, lang);
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

  } catch (e) {
    console.error("CHAT ERROR:", e);
    return res.status(500).json({
      reply: "Estamos experimentando un problema técnico. Intenta nuevamente."
    });
  }
};
