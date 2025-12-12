exports.sendChat = async (req, res) => {
  try {
    const userMessage = (req.body && req.body.message) || "";

    if (!userMessage.trim()) {
      return res.status(400).json({ reply: "Debes escribir un mensaje." });
    }

    // Guardamos mensaje del usuario
    await Message.create({ role: "user", text: userMessage });

    // 1️⃣ Respuesta personalizada
    const custom = await findCustomReply(userMessage);
    if (custom) {
      await Message.create({ role: "bot", text: custom, source: "custom" });
      return res.json({ reply: custom, source: "custom" });
    }

    // 2️⃣ Construcción del prompt
    const messages = [
      {
        role: "system",
        content:
          "Eres el asistente INDARELÍN. Responde de forma clara, respetuosa y útil.",
      },
      { role: "user", content: userMessage },
    ];

    let reply;
    let source;

    // 3️⃣ INTENTAR GEMINI PRIMERO
    try {
      reply = await callGemini(messages);
      source = "gemini";

      // Si Gemini responde vacío o con error
      if (!reply || reply.includes("Hubo un problema")) {
        throw new Error("Gemini falló");
      }
    } catch (errorGemini) {
      console.warn("Gemini falló, intentando OpenAI...");

      // 4️⃣ SI GEMINI FALLA → INTENTAR OPENAI
      try {
        reply = await callOpenAI(messages);
        source = "openai";

        if (!reply || reply.includes("Hubo un problema")) {
          throw new Error("OpenAI falló");
        }
      } catch (errorOpenAI) {
        console.warn("OpenAI también falló");

        // 5️⃣ Fallback si ambos fallan
        reply =
          "En este momento estamos experimentando alta demanda. Por favor intenta nuevamente en unos minutos.";
        source = "fallback";
      }
    }

    // Guardar la respuesta del bot
    await Message.create({
      role: "bot",
      text: reply,
      source: source,
    });

    res.json({ reply, source });

  } catch (error) {
    console.error("Error en sendChat:", error);
    res.status(500).json({ reply: "Error en el servidor." });
  }
};
