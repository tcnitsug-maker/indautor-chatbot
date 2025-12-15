const Message = require("../models/Message");
const CustomReply = require("../models/CustomReply");
const BlockedIP = require("../models/BlockedIP");
const Setting = require("../models/Setting");
const fetch = require("node-fetch");

// =====================
// NORMALIZACIÓN TEXTO
// =====================
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

// =====================
// MATCH CUSTOM REPLIES
// =====================
function scoreMatch(msgTokens, reply) {
  let score = 0;

  // Trigger exacto
  if (reply.trigger && norm(reply.trigger) === msgTokens.join(" ")) {
    score += 100;
  }

  // Keywords
  const kws = Array.isArray(reply.keywords)
    ? reply.keywords
    : String(reply.keywords || "")
        .split(/[,|]/)
        .map(s => s.trim())
        .filter(Boolean);

  for (const k of kws) {
    const kt = norm(k);
    if (kt && msgTokens.includes(kt)) {
      score += 10;
    }
  }

  // Prioridad pesa mucho
  score += (reply.priority || 1) * 5;

  return score;
}

// =====================
// SEND CHAT
// =====================
exports.sendChat = async (req, res) => {
  try {
    const userMessage = String(req.body.message || "").trim();
    if (!userMessage) {
      return res.status(400).json({ error: "Mensaje vacío" });
    }

    const ip =
      req.headers["x-forwarded-for"]?.split(",")[0] ||
      req.socket.remoteAddress ||
      "unknown";

    // ---------------------
    // IP BLOQUEADA
    // ---------------------
    const blocked = await BlockedIP.findOne({ ip, active: true }).lean();
    if (blocked) {
      return res.json({
        reply:
          "Tu acceso ha sido bloqueado temporalmente por razones de seguridad."
      });
    }

    // ---------------------
    // NORMALIZAR MENSAJE
    // ---------------------
    const msgTokens = tokens(userMessage);

    // ---------------------
    // 1️⃣ CUSTOM REPLIES
    // ---------------------
    const replies = await CustomReply.find({
      enabled: true
    })
      .sort({ priority: -1 })
      .lean();

    let best = null;
    let bestScore = 0;

    for (const r of replies) {
      const s = scoreMatch(msgTokens, r);
      if (s > bestScore) {
        bestScore = s;
        best = r;
      }
    }

    // Umbral mínimo de match
    if (best && bestScore >= 15) {
      await Message.create({
        role: "custom",
        text: best.response,
        ip,
        source: "custom"
      });

      return res.json({
        reply: best.response,
        type: best.type || "text",
        video_url: best.video_url || null
      });
    }

    // ---------------------
    // 2️⃣ IA (LÍMITE)
    // ---------------------
    const setting = await Setting.findOne({
      key: "ai_daily_limit_per_ip"
    }).lean();

    const limit = Number(setting?.value || 0);

    if (limit > 0) {
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const used = await Message.countDocuments({
        ip,
        source: "ai",
        createdAt: { $gte: today }
      });

      if (used >= limit) {
        return res.json({
          reply:
            "Has alcanzado el límite diario de consultas con inteligencia artificial."
        });
      }
    }

    // ---------------------
    // 3️⃣ LLAMAR IA (GEMINI)
    // ---------------------
    const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
    let aiReply =
      "En este momento no puedo procesar tu solicitud. Intenta más tarde.";

    if (GEMINI_API_KEY) {
      try {
        const r = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${GEMINI_API_KEY}`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              contents: [{ parts: [{ text: userMessage }] }]
            })
          }
        );

        const j = await r.json();
        aiReply =
          j.candidates?.[0]?.content?.parts?.[0]?.text || aiReply;
      } catch (e) {
        console.error("Gemini error:", e);
      }
    }

    await Message.create({
      role: "assistant",
      text: aiReply,
      ip,
      source: "ai"
    });

    res.json({ reply: aiReply });
  } catch (err) {
    console.error("sendChat error:", err);
    res.json({
      reply:
        "Estamos experimentando un problema técnico. Intenta nuevamente en unos minutos."
    });
  }
};
