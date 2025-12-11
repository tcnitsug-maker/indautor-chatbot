const Message = require("../models/Message");

exports.getMetrics = async (req, res) => {
  try {
    const totalMessages = await Message.countDocuments();

    const openaiCount = await Message.countDocuments({ source: "openai" });
    const geminiCount = await Message.countDocuments({ source: "gemini" });
    const customCount = await Message.countDocuments({ source: "custom" });

    // Últimos 7 días
    const last7Days = await Message.aggregate([
      {
        $group: {
          _id: {
            $dateToString: { format: "%Y-%m-%d", date: "$createdAt" }
          },
          count: { $sum: 1 }
        }
      },
      { $sort: { _id: 1 } }
    ]);

    // Mensajes por hora
    const perHour = await Message.aggregate([
      {
        $group: {
          _id: { $hour: "$createdAt" },
          count: { $sum: 1 }
        }
      },
      { $sort: { _id: 1 } }
    ]);

    // Últimos 30 días
    const last30Days = await Message.aggregate([
      {
        $group: {
          _id: {
            $dateToString: { format: "%Y-%m-%d", date: "$createdAt" }
          },
          count: { $sum: 1 }
        }
      },
      { $sort: { _id: 1 } }
    ]);

    // Comparación semanal
    const thisWeek = await Message.aggregate([
      {
        $group: {
          _id: { $dayOfWeek: "$createdAt" },
          count: { $sum: 1 }
        }
      }
    ]);

    const lastWeek = await Message.aggregate([
      {
        $group: {
          _id: { $dayOfWeek: "$createdAt" },
          count: { $sum: 1 }
        }
      }
    ]);

    // Palabras más usadas
    const topWords = await Message.aggregate([
      {
        $project: {
          words: {
            $split: ["$text", " "]
          }
        }
      },
      { $unwind: "$words" },
      {
        $group: {
          _id: "$words",
          count: { $sum: 1 }
        }
      },
      { $sort: { count: -1 } },
      { $limit: 20 }
    ]);

    res.json({
      totalMessages,
      openaiCount,
      geminiCount,
      customCount,
      last7Days,
      perHour,
      last30Days,
      thisWeek,
      lastWeek,
      topWords: topWords.map(w => ({ word: w._id, count: w.count })),
    });

  } catch (error) {
    console.error("Error metrics:", error);
    res.status(500).json({ error: "Error obteniendo métricas" });
  }
};

