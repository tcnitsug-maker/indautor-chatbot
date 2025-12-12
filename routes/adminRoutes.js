const express = require("express");
const router = express.Router();
const Message = require("../models/Message");
const fetch = require("node-fetch");

// Obtener lista de IPs con estadísticas
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
          lastSeen: 0
        };
      }

      stats[msg.ip].total++;
      stats[msg.ip].lastSeen = msg.createdAt;
    }

    res.json(Object.values(stats));
  } catch (err) {
    console.error("Error obteniendo IPs:", err);
    res.status(500).json({ error: "Error obteniendo IPs" });
  }
});

// Obtener ubicación geográfica de una IP
router.get("/ipinfo/:ip", async (req, res) => {
  try {
    const ip = req.params.ip;
    const url = `http://ip-api.com/json/${ip}?fields=status,country,regionName,city,isp,query,lat,lon`;

    const apiRes = await fetch(url);
    const data = await apiRes.json();

    res.json(data);
  } catch (err) {
    console.error("Error obteniendo info IP:", err);
    res.status(500).json({ error: "No se pudo obtener información." });
  }
});

module.exports = router;
