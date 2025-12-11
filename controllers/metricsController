const Message = require("../models/Message");

exports.getMetrics = async (req, res) => {
  try {
    // Total de mensajes
    const totalMessages = await Message.countDocuments();

    // OpenAI, Gemini, Custom
    const openaiCount = await Message.countDocuments({ source: "openai" });
    const geminiCount = await Message.countDocuments({ source: "gemini" });
    const customCount = await Message.countDocuments({ source: "custom" });

    // Últimos 7 días (gráfica)
    const last7Days = await Message.aggregate([
      {
        $group: {
          _id: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } },
          count: { $sum: 1 }
        }
      },
      { $sort: { _id: 1 } }
    ]);

    // Horas pico (0–23 hrs)
    const perHour = await Message.aggregate([
      {
        $group: {
          _id: { $hour: "$createdAt" },
          count: { $sum: 1 }
        }
      },
      { $sort: { _id: 1 } }
    ]);

    // Palabras más usadas (muy básico pero funcional)
    const allMessages = await Message.find().select("text");
    let wordMap = {};
    allMessages.forEach(msg => {
      const words = msg.text.toLowerCase().replace(/[^a-zA-Záéíóúñ0-9 ]/g, "").split(" ");
      words.forEach(w => {
        if (w.length > 4) { 
          wordMap[w] = (wordMap[w] || 0) + 1;
        }
      });
    });

    const topWords = Object.entries(wordMap)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 20)
      .map(w => ({ word: w[0], count: w[1] }));

    // Comparación semanal
    const last14Days = await Message.aggregate([
      {
        $group: {
          _id: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } },
          count: { $sum: 1 }
        }
      },
      { $sort: { _id: 1 } }
    ]);

    const thisWeek = last14Days.slice(-7);
    const lastWeek = last14Days.slice(-14, -7);

    res.json({
      totalMessages,
      openaiCount,
      geminiCount,
      customCount,
      last7Days,
      perHour,
      topWords,
      thisWeek,
      lastWeek
    });
  } catch (error) {
    console.error("Error métricas:", error);
    res.status(500).json({ error: "Error obteniendo métricas" });
  }
};
