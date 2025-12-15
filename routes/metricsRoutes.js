const express = require("express");
const router = express.Router();
const XLSX = require("xlsx");
const Message = require("../models/Message");

/**
 * Compatibilidad con el panel:
 * GET /metrics/export-xlsx?start=YYYY-MM-DD&end=YYYY-MM-DD
 * Devuelve un XLSX con conteo de mensajes del bot por fuente (openai/gemini/custom)
 */
router.get("/export-xlsx", async (req, res) => {
  try {
    const { start, end } = req.query;
    const q = { role: "bot" };

    if (start || end) {
      q.createdAt = {};
      if (start) q.createdAt.$gte = new Date(start);
      if (end) q.createdAt.$lte = new Date(end);
    }

    const agg = await Message.aggregate([
      { $match: q },
      { $group: { _id: "$source", count: { $sum: 1 } } },
      { $sort: { count: -1 } },
    ]);

    const data = agg.map(r => ({
      Fuente: r._id || "desconocido",
      Cantidad: r.count,
    }));

    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.json_to_sheet(data);
    XLSX.utils.book_append_sheet(wb, ws, "IA");

    const buf = XLSX.write(wb, { type: "buffer", bookType: "xlsx" });
    res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
    res.setHeader("Content-Disposition", "attachment; filename=metricas.xlsx");
    res.send(buf);
  } catch (e) {
    console.error("Error exportando /metrics/export-xlsx:", e);
    res.status(500).json({ error: "Error exportando métricas (XLSX)" });
  }
});

module.exports = router;
