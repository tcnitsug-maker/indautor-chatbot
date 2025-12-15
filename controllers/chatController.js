const Message = require("../models/Message");
const BlockedIP = require("../models/BlockedIP");
const Setting = require("../models/Setting");
const CustomReply = require("../models/CustomReply");
const fetch = require("node-fetch");

const OPENAI_MODEL = process.env.OPENAI_MODEL || "gpt-4o-mini";
const GEMINI_MODEL = process.env.GEMINI_MODEL || "gemini-2.0-flash";

const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

// ----------------------
// Helpers: normalización y fuzzy matching
// ----------------------
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
function jaccard(aTokens, bTokens) {
  const A = new Set(aTokens);
  const B = new Set(bTokens);
  if (!A.size || !B.size) return 0;
  let inter = 0;
  for (const x of A) if (B.has(x)) inter++;
  const union = A.size + B.size - inter;
  return union ? inter / union : 0;
}
function levenshtein(a, b) {
  a = norm(a); b = norm(b);
  const m = a.length, n = b.length;
  if (!m) return n;
  if (!n) return m;
  const dp = Array.from({ length: m + 1 }, () => Array(n + 1).fill(0));
  for (let i = 0; i <= m; i++) dp[i][0] = i;
  for (let j = 0; j <= n; j++) dp[0][j] = j;
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      dp[i][j] = Math.min(
        dp[i - 1][j] + 1,
        dp[i][j - 1] + 1,
        dp[i - 1][j - 1] + cost
      );
    }
  }
  return dp[m][n];
}
function similarity(a, b) {
  // mezcla robusta: inclusión + jaccard + levenshtein ratio
  const na = norm(a), nb = norm(b);
  if (!na || !nb) return 0;

  // si el usuario contiene el trigger literal (normalizado), score alto
  if (na.includes(nb) || nb.includes(na)) return 0.92;

  const ta = tokens(na), tb = tokens(nb);
  const jac = jaccard(ta, tb);

  const dist = levenshtein(na, nb);
  const maxLen = Math.max(na.length, nb.length) || 1;
  const levRatio = 1 - dist / maxLen;

  // ponderación
  return (0.55 * jac) + (0.45 * levRatio);
}

// ----------------------
// Settings helpers (persistente para alternancia)
// ----------------------
async function getSetting(key, fallback = null) {
  const doc = await Setting.findOne({ key }).lean();
  return doc ? doc.value : fallback;
}
async function setSetting(key, value) {
  await Setting.findOneAndUpdate(
    { key },
    { value, updatedAt: new Date() },
    { upsert: true, new: true }
  );
}

// ----------------------
// Prioridad: Respuestas personalizadas
// ----------------------
async function findCustomReply(userMsg) {
  const msg = norm(userMsg);
  if (!msg) return null;

  // Solo habilitadas y orden por prioridad
  const list = await CustomReply.find({ enabled: true })
    .sort({ priority: -1, updatedAt: -1 })
    .lean();

  let best = null;
  let bestScore = 0;

  for (const r of list) {
    const trigger = r.trigger || r.question || "";
    const response = r.response || r.answer || "";
    if (!trigger || !response) continue;

    // score por trigger
    let score = similarity(msg, trigger);

    // boost por keywords si existen
    const kws = Array.isArray(r.keywords) ? r.keywords : [];
    for (const kw of kws) {
      const nkw = norm(kw);
      if (!nkw) continue;
      if (msg.includes(nkw)) score += 0.10; // boost por keyword exacta
      else score += 0.04 * similarity(msg, nkw); // boost por fuzzy keyword
    }

    // cap
    if (score > 1) score = 1;

    if (score > bestScore) {
      bestScore = score;
      best = r;
    }
  }

  // umbral: ajustado para tolerar faltas de ortografía sin disparar falsos positivos
  if (best && bestScore >= 0.78) {
    return {
      reply: best.response || best.answer,
      source: "custom",
      matchScore: Number(bestScore.toFixed(3)),
    };
  }
  return null;
}

// ----------------------
// IA: alternancia Gemini ↔ OpenAI con fallback
// ----------------------
async function askOpenAI(userMsg) {
  if (!OPENAI_API_KEY) throw new Error("Falta OPENAI_API_KEY");

  const system =
    "Eres un asistente institucional de INDARELÍN/INDAUTOR. Responde en español, tono jurídico-administrativo, claro y breve. Si faltan datos, solicita lo mínimo necesario. No inventes requisitos; si no estás seguro, indícalo y sugiere verificar en el sitio oficial.";

  const r = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${OPENAI_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: OPENAI_MODEL,
      temperature: 0.2,
      messages: [
        { role: "system", content: system },
        { role: "user", content: userMsg },
      ],
    }),
  });

  const data = await r.json();
  if (!r.ok) {
    throw new Error(`OpenAI error: ${JSON.stringify(data)}`);
  }
  const reply = data?.choices?.[0]?.message?.content?.trim();
  return reply || "No se obtuvo respuesta del servicio.";
}

async function askGemini(userMsg) {
  if (!GEMINI_API_KEY) throw new Error("Falta GEMINI_API_KEY");

  const url = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${GEMINI_API_KEY}`;

  const r = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      contents: [{ parts: [{ text: userMsg }] }],
      generationConfig: { temperature: 0.2 },
    }),
  });

  const data = await r.json();
  if (!r.ok) {
    throw new Error(`Gemini error: ${JSON.stringify(data)}`);
  }

  const reply =
    data?.candidates?.[0]?.content?.parts?.map(p => p.text).join(" ").trim();

  return reply || "No se obtuvo respuesta del servicio.";
}

async function askAIAlternating(userMsg) {
  // estado persistente (no se pierde con reinicios)
  let turn = await getSetting("ai_turn", "gemini"); // "gemini" | "openai"
  const first = turn === "gemini" ? "gemini" : "openai";
  const second = first === "gemini" ? "openai" : "gemini";

  // siguiente turno (para alternar en la próxima solicitud)
  await setSetting("ai_turn", second);

  // intenta primero el asignado; si falla, fallback al otro
  try {
    if (first === "gemini") return { reply: await askGemini(userMsg), source: "gemini" };
    return { reply: await askOpenAI(userMsg), source: "openai" };
  } catch (e1) {
    console.error("IA primaria falló:", first, e1?.message || e1);
    try {
      if (second === "gemini") return { reply: await askGemini(userMsg), source: "gemini_fallback" };
      return { reply: await askOpenAI(userMsg), source: "openai_fallback" };
    } catch (e2) {
      console.error("IA fallback también falló:", second, e2?.message || e2);
      return {
        reply: "Estamos experimentando un problema técnico. Intenta nuevamente en unos minutos.",
        source: "fallback",
      };
    }
  }
}

// ----------------------
// Endpoint principal
// ----------------------
exports.sendChat = async (req, res) => {
  try {
    const ip =
      req.headers["x-forwarded-for"]?.split(",")[0]?.trim() ||
      req.socket?.remoteAddress ||
      "unknown";

    const userMsg = String(req.body?.message || "").trim();
    if (!userMsg) return res.status(400).json({ reply: "Falta el mensaje." });

    // 1) bloqueo IP
    const blocked = await BlockedIP.findOne({ ip, active: true }).lean();
    if (blocked) {
      return res.status(403).json({
        reply: "Acceso restringido. Si considera que es un error, contacte al administrador.",
      });
    }

    // Guardar USER
    await Message.create({ role: "user", text: userMsg, ip, source: "user" });

    // 2) prioridad: respuesta personalizada
    const custom = await findCustomReply(userMsg);
    if (custom) {
      await Message.create({ role: "bot", text: custom.reply, ip, source: custom.source });
      return res.json({ reply: custom.reply, source: custom.source, matchScore: custom.matchScore });
    }

    // 3) si no hay match: alternar IA
    const ai = await askAIAlternating(userMsg);

    await Message.create({ role: "bot", text: ai.reply, ip, source: ai.source });
    return res.json({ reply: ai.reply, source: ai.source });
  } catch (error) {
    console.error("Error en sendChat:", error);
    return res.status(500).json({
      reply: "Estamos experimentando un problema técnico. Intenta nuevamente en unos minutos.",
    });
  }
};

