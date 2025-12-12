//-----------------------------------------------------------------------
// SISTEMA ANTI-SPAM / ANTI-FLOOD POR IP
//-----------------------------------------------------------------------

const floodMap = new Map(); // { ip: { lastTime, count, blockedUntil } }

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

  // Tiempo entre mensajes
  const diff = now - data.lastTime;

  if (diff < FLOOD_MIN_DELAY) {
    data.count++;

    if (data.count >= FLOOD_MAX_BURST) {
      // Bloquear al usuario
      data.blockedUntil = now + FLOOD_BLOCK_TIME;
      data.count = 0;
      return { blocked: true, wait: FLOOD_BLOCK_TIME };
    }
  } else {
    // Se resetea contador si ya pasó tiempo
    data.count = 0;
  }

  data.lastTime = now;
  floodMap.set(ip, data);
  return { blocked: false };
}

//-----------------------------------------------------------------------
// CONTROLADOR PRINCIPAL
//-----------------------------------------------------------------------

exports.sendChat = async (req, res) => {
  try {
    const ip = req.headers["x-forwarded-for"]?.split(",")[0] || req.ip;

    // 1️⃣ Verificación anti-flood
    const flood = checkFlood(ip);
    if (flood.blocked) {
      const sec = Math.ceil(flood.wait / 1000);
      return res.json({
        reply: `Por favor espera ${sec} segundos antes de enviar otro mensaje.`,
        source: "flood-protection",
      });
    }

    const userMessage = req.body?.message?.trim();
    if (!userMessage) {
      return res.status(400).json({ reply: "Debes escribir un mensaje." });
    }

    // Guardar mensaje del usuario
    await Message.create({ role: "user", text: userMessage, ip });

    //-------------------------------------------------------------------
    // 2️⃣ Respuesta personalizada primero
    //-------------------------------------------------------------------
    const custom = await findCustomReply(userMessage);
    if (custom) {
      await Message.create({ role: "bot", text: custom, source: "custom" });
      return res.json({ reply: custom, source: "custom" });
    }

    //-------------------------------------------------------------------
    // 3️⃣ Construcción del prompt
    //-------------------------------------------------------------------
    const messages = [
      {
        role: "system",
        content:
          "Eres el asistente INDARELÍN. Responde de forma clara, respetuosa y útil. No das asesoría legal formal; solo informas.",
      },
      { role: "user", content: userMessage },
    ];

    let reply = null;

    //-------------------------------------------------------------------
    // 4️⃣ Intentar GEMINI (2 intentos)
    //-------------------------------------------------------------------
    reply = await callGemini(messages);
    if (!reply) reply = await callGemini(messages);

    if (reply) {
      await Message.create({ role: "bot", text: reply, source: "gemini" });
      return res.json({ reply, source: "gemini" });
    }

    //-------------------------------------------------------------------
    // 5️⃣ Si Gemini falla → intentar OpenAI (2 intentos)
    //-------------------------------------------------------------------
    reply = await callOpenAI(messages);
    if (!reply) reply = await callOpenAI(messages);

    if (reply) {
      await Message.create({ role: "bot", text: reply, source: "openai" });
      return res.json({ reply, source: "openai" });
    }

    //-------------------------------------------------------------------
    // 6️⃣ Si OpenAI también falla → fallback institucional
    //-------------------------------------------------------------------
    reply =
      "En este momento estamos experimentando alta demanda. Por favor intenta nuevamente en unos minutos.";

    await Message.create({ role: "bot", text: reply, source: "fallback" });

    res.json({ reply, source: "fallback" });

  } catch (error) {
    co
