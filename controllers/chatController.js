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
   🔧 HELPERS DE TEXTO / MATCHING
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
   🎥 MAPEO DE TRÁMITES → VIDEOS
========================================================= */
function getVideoForReply(text = "") {
  const t = text.toLowerCase();

  if (t.includes("registrarme en INDARELIN")) {
    return "https://youtu.be/NaDQ1HK4hjk";
  }
  if (t.includes("como desahogar un tramite")) {
    return "https://youtu.be/0-u1o0T4Hfs";
  }
  if (t.includes("Modifica tu información")) {
    return "https://youtu.be/Zl_qTv9WJJk";
  }
  if (t.includes("Alta de representantes legales")) {
    return "https://youtu.be/gnzDyWSwCQs";
  }
   if (t.includes("Registra a tus títulares")) {
    return "https://youtu.be/pKs-mFPPEZE";
  }
    if (t.includes("Registra tus autores, productores y editores")) {
    return "https://youtu.be/sPH6AtE0A_8";
  }

  return null;
}

/* =========================================================
   ⚙️ SETTINGS (ALTERNANCIA IA)
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
   ⭐ RESPUESTAS PERSONALIZADAS
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
      matchScore: Number(bestScore.toFixed(3))
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
      "Authorization": `Bearer ${OPENAI_API_KEY}`,
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
  const data = await r.json();
  return data?.choices?.[0]?.message?.content?.trim();
}

async function askGemini(msg) {
  const r = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${GEMINI_API_KEY}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ contents: [{ parts: [{ text: msg }] }] })
    }
  );
  const data = await r.json();
  return data?.candidates?.[0]?.content?.parts?.map(p => p.text).join(" ");
}

async function askAIAlternating(msg) {
  const turn = await getSetting("ai_turn", "gemini");
  await setSetting("ai_turn", turn === "gemini" ? "openai" : "gemini");
  try {
    return { reply: turn === "gemini" ? await askGemini(msg) : await askOpenAI(msg), source: turn };
  } catch {
    return { reply: "Servicio temporalmente no disponible.", source: "fallback" };
  }
}

/* =========================================================
   🚀 ENDPOINT PRINCIPAL
========================================================= */
exports.sendChat = async (req, res) => {
  try {
    const ip = req.headers["x-forwarded-for"]?.split(",")[0] || req.socket.remoteAddress;
    const userMsg = String(req.body?.message || "").trim();
    if (!userMsg) return res.status(400).json({ reply: "Falta el mensaje." });

    const blocked = await BlockedIP.findOne({ ip, active: true }).lean();
    if (blocked) {
      return res.status(403).json({
        reply: "Acceso restringido. Contacte al administrador."
      });
    }

    await Message.create({ role: "user", text: userMsg, ip, source: "user" });

    const custom = await findCustomReply(userMsg);
    if (custom) {
      const videoUrl = getVideoForReply(custom.reply);
      await Message.create({ role: "bot", text: custom.reply, ip, source: custom.source });
      return res.json({
        reply: custom.reply,
        source: custom.source,
        matchScore: custom.matchScore,
        videoUrl
      });
    }

    const ai = await askAIAlternating(userMsg);
    const videoUrl = getVideoForReply(ai.reply);

    await Message.create({ role: "bot", text: ai.reply, ip, source: ai.source });
    return res.json({
      reply: ai.reply,
      source: ai.source,
      videoUrl
    });

  } catch (e) {
    console.error(e);
    return res.status(500).json({
      reply: "Estamos experimentando un problema técnico. Intenta nuevamente."
    });
  }
};
