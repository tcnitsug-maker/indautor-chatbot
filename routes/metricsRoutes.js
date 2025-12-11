const express = require("express");
const router = express.Router();
const Message = require("../models/Message");

router.get("/", async (req, res) => {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const totalHoy = await Message.countDocuments({
      createdAt: { $gte: today }
    });

    const iaHoy = await Message.countDocuments({
      role: "bot",
      source: { $in: ["gemini", "openai"] },
      createdAt: { $gte: today }
    });

    const customHoy = await Message.countDocuments({
      role: "bot",
      source: "custom",
      createdAt: { $gte: today }
    });

    const topPreguntas = await Message.aggregate([
      { $match: { role: "user" } },
      { $group: { _id: "$text", count: { $sum: 1 } } },
      { $sort: { count: -1 } },
      { $limit: 10 }
    ]);

    res.json({
      totalHoy,
      iaHoy,
      customHoy,
      iaPorcentaje: totalHoy ? (iaHoy / totalHoy) * 100 : 0,
      customPorcentaje: totalHoy ? (customHoy / totalHoy) * 100 : 0,
      topPreguntas
    });

  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Error obteniendo métricas" });
  }
});

module.exports = router;
