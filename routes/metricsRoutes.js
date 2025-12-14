const express = require("express");
const router = express.Router();
const Message = require("../models/Message");


// ===============================
// MÉTRICAS DEL DÍA ACTUAL
// ===============================
router.get("/", async (req, res) => {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const data = await calcularMetricas(today, new Date());
    res.json(data);

  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Error obteniendo métricas" });
  }
});


// ===============================
// MÉTRICAS POR RANGO DE FECHAS
// ===============================
router.get("/range", async (req, res) => {
  try {
    const { start, end } = req.query;

    if (!start || !end) {
      return res.status(400).json({ error: "Faltan parámetros start y end" });
    }

    const inicio = new Date(start);
    const fin = new Date(end);
    fin.setHours(23, 59, 59, 999);

    const data = await calcularMetricas(inicio, fin);
    res.json(data);

  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Error obteniendo métricas del rango" });
  }
});


// ===============================
// NUEVO: ACTIVIDAD POR HORA
// ===============================
router.get("/hourly", async (req, res) => {
  try {
    const { start, end } = req.query;

    const inicio = start ? new Date(start) : new Date();
    const fin = end ? new Date(end) : new Date();

    if (!start) inicio.setHours(0, 0, 0, 0);
    fin.setHours(23, 59, 59, 999);

    const porHora = await Message.aggregate([
      { $match: { createdAt: { $gte: inicio, $lte: fin } } },
      {
        $group: {
          _id: { $hour: "$createdAt" },
          total: { $sum: 1 }
        }
      },
      { $sort: { "_id": 1 } }
    ]);

    res.json({ porHora });

  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Error obteniendo actividad por hora" });
  }
});


// ===============================
// NUEVO: COMPARATIVA GEMINI / OPENAI
// ===============================
router.get("/compare", async (req, res) => {
  try {
    const { start, end } = req.query;

    const inicio = start ? new Date(start) : new Date();
    const fin = end ? new Date(end) : new Date();

    if (!start) inicio.setHours(0, 0, 0, 0);
    fin.setHours(23, 59, 59, 999);

    const data = await Message.aggregate([
      { $match: { role: "bot", createdAt: { $gte: inicio, $lte: fin } } },
      {
        $group: {
          _id: "$source",
          total: { $sum: 1 }
        }
      }
    ]);

    res.json({
      gemini: data.find(e => e._id === "gemini")?.total || 0,
      openai: data.find(e => e._id === "openai")?.total || 0,
      custom: data.find(e => e._id === "custom")?.total || 0,
    });

  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Error comparando IA" });
  }
});


// ===============================
// NUEVO: EXPORTAR A EXCEL (CSV)
// ===============================
router.get("/export", async (req, res) => {
  try {
    const { start, end } = req.query;

    const inicio = start ? new Date(start) : new Date("2000-01-01");
    const fin = end ? new Date(end) : new Date();
    fin.setHours(23, 59, 59, 999);

    const mensajes = await Message.find({
      createdAt: { $gte: inicio, $lte: fin }
    }).lean();

    let csv = "rol,texto,fuente,fecha\n";

    mensajes.forEach(m => {
      const cleanText = (m.text || "").replace(/,/g, " ");
      csv += `${m.role},${cleanText},${m.source},${m.createdAt}\n`;
    });

    res.header("Content-Type", "text/csv");
    res.attachment(`metricas_${start || "todo"}_${end || "actual"}.csv`);
    return res.send(csv);

  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Error exportando CSV" });
  }
});


// ===============================
// FUNCIÓN GENERAL DE MÉTRICAS
// ===============================
async function calcularMetricas(inicio, fin) {
  const total = await Message.countDocuments({
    createdAt: { $gte: inicio, $lte: fin }
  });

  const ia = await Message.countDocuments({
    role: "bot",
    source: { $in: ["gemini", "openai"] },
    createdAt: { $gte: inicio, $lte: fin }
  });

  const custom = await Message.countDocuments({
    role: "bot",
    source: "custom",
    createdAt: { $gte: inicio, $lte: fin }
  });

  const topPreguntas = await Message.aggregate([
    { $match: { role: "user", createdAt: { $gte: inicio, $lte: fin } } },
    { $group: { _id: "$text", count: { $sum: 1 } } },
    { $sort: { count: -1 } },
    { $limit: 10 }
  ]);

  const porDia = await Message.aggregate([
    { $match: { createdAt: { $gte: inicio, $lte: fin } } },
    {
      $group: {
        _id: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } },
        total: { $sum: 1 }
      }
    },
    { $sort: { "_id": 1 } }
  ]);

  return {
    total,
    ia,
    custom,
    iaPorcentaje: total ? (ia / total) * 100 : 0,
    customPorcentaje: total ? (custom / total) * 100 : 0,
    topPreguntas,
    porDia
  };
}

module.exports = router;
