const Message = require("../models/Message");
const CustomReply = require("../models/CustomReply");
const fetch = require("node-fetch");

const OPENAI_API_URL = "https://api.openai.com/v1/chat/completions";
const OPENAI_MODEL = "gpt-4.1-mini";

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const GEMINI_MODEL = process.env.GEMINI_MODEL || "gemini-1.5-flash";

let useGemini = true; // true = Gemini, false = OpenAI

function normalizeText(text) {
  return (text || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9áéíóúüñ\s]/gi, " ")
    .replace(/\s+/g, " ")
    .trim();
}

async function findBestCustomReply(userMessage) {
  const normMsg = normalizeText(userMessage);
  const msgWords = new Set(
    normMsg.split(" ").filter(w => w && w.length > 2)
  );

  const replies = await CustomReply.find({ enabled: true });

  let best = null;
  let bestScore = 0;

  for (const r of replies) {
    const normQ = normalizeText(r.question || "");
    const qWords = new Set(
      normQ.split(" ").filter(w => w && w.length > 2)
    );

    const inter = new Set([...msgWords].filter(x => qWords.has(x)));
    const union = new Set([...msgWords, ...qWords]);
    let score = union.size > 0 ? inter.size / union.size : 0;

    if (normMsg.includes(normQ) || normQ.includes(normMsg)) {
      score += 0.4;
    }

    if (r.keywords && r.keywords.length > 0) {
      const kwAll = r.keywords.every(kw =>
        normMsg.includes(normalizeText(kw))
      );
      if (kwAll) score += 0.4;
    }

    if (score > bestScore) {
      bestScore = score;
      best = r;
    }
  }

  if (best && bestScore >= 0.5) {
    return best;
  }

  return null;
}

async function askOpenAI(userMessage) {
  const body = {
    model: OPENAI_MODEL,
    messages: [
      {
        role: "system",
        content:
          "Eres INDARELÍN, un asistente legal y administrativo en español. Responde de forma clara, útil y respetuosa."
      },
      {
        role: "user",
        content: userMessage
      }
    ]
  };

  const response = await fetch(OPENAI_API_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${process.env.OPENAI_API_KEY}`
    },
    body: JSON.stringify(body)
  });

  const data = await response.json();

  if (!response.ok) {
    console.error("Error OpenAI:", data);
    throw new Error("Error consultando OpenAI");
  }

  const reply = data.choices?.[0]?.message?.content || "No tengo respuesta.";
  return reply;
}

async function askGemini(userMessage) {
  if (!GEMINI_API_KEY) {
    throw new Error("Falta GEMINI_API_KEY");
  }

  const url = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${GEMINI_API_KEY}`;

  const prompt = `
Eres INDARELÍN, un asistente legal y administrativo en español. 
Responde de forma clara, útil, breve y respetuosa.

Usuario: ${userMessage}
`;

  const body = {
    contents: [
      {
        parts: [{ text: prompt }]
      }
    ]
  };

  const response = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify(body)
  });

  const data = await response.json();

  if (!response.ok) {
    console.error("Error Gemini:", data);
    throw new Error("Error consultando Gemini");
  }

  const reply =
    data.candidates?.[0]?.content?.parts?.[0]?.text || "No tengo respuesta.";
  return reply;
}

exports.sendChat = async (req, res) => {
  try {
    const userMessage = req.body.message;

    if (!userMessage || typeof userMessage !== "string") {
      return res.status(400).json({ reply: "Mensaje inválido" });
    }

    await Message.create({ role: "user", text: userMessage });

    const custom = await findBestCustomReply(userMessage);
    if (custom) {
      const reply = custom.answer;
      await Message.create({ role: "bot", text: reply });
      return res.json({ reply });
    }

    let reply = "";
    let triedGemini = false;
    let triedOpenAI = false;

    try {
      if (useGemini) {
        reply = await askGemini(userMessage);
        triedGemini = true;
      } else {
        reply = await askOpenAI(userMessage);
        triedOpenAI = true;
      }
    } catch (err) {
      console.error("Error en IA principal:", err.message);
      try {
        if (!triedGemini) {
          reply = await askGemini(userMessage);
          triedGemini = true;
        } else if (!triedOpenAI) {
          reply = await askOpenAI(userMessage);
          triedOpenAI = true;
        }
      } catch (err2) {
        console.error("Error en IA de respaldo:", err2.message);
        reply =
          "Por el momento no puedo consultar la inteligencia artificial. Intenta de nuevo más tarde.";
      }
    }

    if (reply && !reply.startsWith("Por el momento no puedo consultar")) {
      useGemini = !useGemini;
    }

    await Message.create({ role: "bot", text: reply });

    res.json({ reply });
  } catch (error) {
    console.error("Error en sendChat:", error);
    res.status(500).json({ reply: "Error en el servidor." });
  }
};
