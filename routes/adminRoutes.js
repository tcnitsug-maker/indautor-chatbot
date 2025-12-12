// routes/adminRoutes.js
const express = require("express");
const router = express.Router();
const Message = require("../models/Message");
const fetch = require("node-fetch");

// -----------------------------------------------------
// GET /admin/ips → Lista todas las IPs conectadas
// -----------------------------------------------------
router.get("/ips", async (req, res) => {
  try {
    const messages = await Message.find({}, { ip: 1, createdAt: 1 }).lean();

    const stats = {};

    for (const msg of messages) {
      if (!msg.ip) continue;

      if (!stats[msg.ip]) {
        stats[msg.ip] = {
          ip: msg.ip,
          total: 0,
          lastSeen: msg.createdAt,
        };
      }

      stats[msg.ip].total++;

      if (msg.createdAt > stats[msg.ip].lastSeen) {
        stats[msg.ip].lastSeen = msg.createdAt;
      }
    }

    res.json(Object.values(stats));
  } catch (err) {
    console.error("Error obteniendo IPs:", err);
    res.status(500).json({ error: "Error al obtener lista de IPs" });
  }
});

// -----------------------------------------------------
// GET /admin/ipinfo/:ip → Geolocalización de IP
// -----------------------------------------------------
router.get("/ipinfo/:ip", async (req, res) => {
  try {
    const ip = req.params.ip;

    const url = `http://ip-api.com/json/${ip}?fields=status,country,regionName,city,isp,query,lat,lon`;

    const apiRes = await fetch(url);
    const data = await apiRes.json();

    res.json(data);
  } catch (err) {
    console.error("Error obteniendo info de IP:", err);
    res.status(500).json({ error: "No se pudo obtener info de IP." });
  }
});

// -----------------------------------------------------
// GET /admin/messages/ip/:ip → Historial de una IP
// -----------------------------------------------------
router.get("/messages/ip/:ip", async (req, res) => {
  try {
    const msgs = await Message.find({ ip: req.params.ip }).sort({ createdAt: 1 });
    res.json(msgs);
  } catch (err) {
    console.error("Error historial IP:", err);
    res.status(500).json({ error: "No se pudo obtener historial por IP." });
  }
});

module.exports = router;
