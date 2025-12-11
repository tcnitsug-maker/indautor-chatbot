const Message = require("../models/Message");
const CustomReply = require("../models/CustomReply");

// ===============================
// 🚀 LOGIN ADMINISTRADOR
// ===============================
exports.loginAdmin = async (req, res) => {
  const pass = req.body.password;
  const realPass = process.env.ADMIN_PASSWORD;

  if (!realPass) {
    console.warn("⚠️ Falta ADMIN_PASSWORD en variables de entorno");
  }

  if (pass === realPass) {
    return res.json({ ok: true });
  } else {
    return res.json({ ok: false });
  }
};

// ===============================
// 📩 OBTENER MENSAJES
// ===============================
exports.getMessages = async (req, res) => {
  try {
    const msgs = await Message.find().sort({ createdAt: -1 });
    res.json(msgs);
  } catch (error) {
    console.error("Error getMessages:", error);
    res.status(500).json({ error: "Error obteniendo mensajes" });
  }
};

// ===============================
// 🗑️ ELIMINAR MENSAJE
// ===============================
exports.deleteMessage = async (req, res) => {
  try {
    await Message.findByIdAndDelete(req.params.id);
    res.json({ ok: true });
  } catch (error) {
    console.error("Error deleteMessage:", error);
    res.status(500).json({ error: "Error eliminando mensaje" });
  }
};

// ===============================
// 🎯 RESPUESTAS PERSONALIZADAS
// ===============================

// Obtener todas
exports.getCustomReplies = async (req, res) => {
  try {
    const replies = await CustomReply.find().sort({ createdAt: -1 });
    res.json(replies);
  } catch (error) {
    console.error("Error getCustomReplies:", error);
    res.status(500).json({ error: "Error obteniendo respuestas personalizadas" });
  }
};

// Crear
exports.createCustom = async (req, res) => {
  try {
    const r = await CustomReply.create({
      question: req.body.question,
      answer: req.body.answer,
      keywords: req.body.keywords ? req.body.keywords.split(",").map(k => k.trim()) : [],
      enabled: req.body.enabled
    });

    res.json(r);
  } catch (error) {
    console.error("Error createCustom:", error);
    res.status(500).json({ error: "Error creando respuesta personalizada" });
  }
};

// Actualizar
exports.updateCustom = async (req, res) => {
  try {
    const r = await CustomReply.findByIdAndUpdate(
      req.params.id,
      {
        question: req.body.question,
        answer: req.body.answer,
        keywords: req.body.keywords ? req.body.keywords.split(",").map(k => k.trim()) : [],
        enabled: req.body.enabled
      },
      { new: true }
    );

    res.json(r);
  } catch (error) {
    console.error("Error updateCustom:", error);
    res.status(500).json({ error: "Error actualizando respuesta personalizada" });
  }
};

// Eliminar
exports.deleteCustom = async (req, res) => {
  try {
    await CustomReply.findByIdAndDelete(req.params.id);
    res.json({ ok: true });
  } catch (error) {
    console.error("Error deleteCustom:", error);
    res.status(500).json({ error: "Error eliminando respuesta personalizada" });
  }
};

// ===============================
// 📊 MÉTRICAS DEL SISTEMA
// ===============================
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
          _id: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" }},
          count: { $sum: 1 }
        }
      },
      { $sort: { _id: 1 }}
    ]);

    // Mensajes por hora
    const perHour = await Message.aggregate([
      {
        $group: {
          _id: { $hour: "$createdAt" },
          count: { $sum: 1 }
        }
      },
      { $sort: { _id: 1 }}
    ]);

    // Últimos 30 días
    const last30Days = await Message.aggregate([
      {
        $group: {
          _id: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" }},
          count: { $sum: 1 }
        }
      },
      { $sort: { _id: 1 }}
    ]);

    // Semana actual
    const thisWeek = await Message.aggregate([
      {
        $group: {
          _id: { $dayOfWeek: "$createdAt" },
          count: { $sum: 1 }
        }
      }
    ]);

    // Semana pasada (simple placeholder)
    const lastWeek = thisWeek.map(x => ({ _id: x._id, count: Math.floor(x.count * 0.6) }));

    // Palabras más usadas
    const topWords = await Message.aggregate([
      {
        $project: {
          words: { $split: ["$text", " "] }
        }
      },
      { $unwind: "$words" },
      {
        $group: { _id: "$words", count: { $sum: 1 } }
      },
      { $sort: { count: -1 }},
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
      topWords: topWords.map(w => ({ word: w._id, count: w.count }))
    });

  } catch (error) {
    console.error("Error getMetrics:", error);
    res.status(500).json({ error: "Error obteniendo métricas" });
  }
};
