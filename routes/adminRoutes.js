// routes/adminRoutes.js
const express = require("express");
const router = express.Router();
const Message = require("../models/Message");
const CustomReply = require("../models/CustomReply");
const fetch = require("node-fetch");


// =======================================================================
// 1. GET /admin/messages  → Historial general (Dashboard + tabla general)
// =======================================================================
router.get("/messages", async (req, res) => {
  try {
    const msgs = await Message.find().sort({ createdAt: 1 }).lean();
    res.json(msgs);
  } catch (err) {
    console.error("Error obteniendo mensajes:", err);
    res.status(500).json({ error: "No se pudieron obtener los mensajes." });
  }
});


// =======================================================================
// 2. GET /admin/ips  → Lista de IPs y estadísticas
// =======================================================================
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


// =======================================================================
// 3. GET /admin/ipinfo/:ip → Geolocalización por IP
// =======================================================================
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


// =======================================================================
// 4. GET /admin/messages/ip/:ip → Historial filtrado por IP
// =======================================================================
router.get("/messages/ip/:ip", async (req, res) => {
  try {
    const msgs = await Message.find({ ip: req.params.ip }).sort({ createdAt: 1 }).lean();
    res.json(msgs);
  } catch (err) {
    console.error("Error historial por IP:", err);
    res.status(500).json({ error: "No se pudo obtener historial por IP." });
  }
});


// =======================================================================
// 5. GET /admin/custom-replies → Listar respuestas personalizadas
// =======================================================================
router.get("/custom-replies", async (req, res) => {
  try {
    const replies = await CustomReply.find().lean();
    res.json(replies);
  } catch (err) {
    console.error("Error obteniendo custom replies:", err);
    res.status(500).json({ error: "No se pudieron obtener las respuestas personalizadas." });
  }
});


// =======================================================================
// 6. POST /admin/custom-replies → Crear respuesta personalizada
// =======================================================================
router.post("/custom-replies", async (req, res) => {
  try {
    const { question, answer, keywords } = req.body;

    const reply = await CustomReply.create({
      question,
      answer,
      keywords: keywords || [],
      enabled: true,
    });

    res.json(reply);
  } catch (err) {
    console.error("Error creando custom reply:", err);
    res.status(500).json({ error: "Error creando respuesta personalizada." });
  }
});


// =======================================================================
// 7. DELETE /admin/custom-replies/:id → Eliminar respuesta personalizada
// =======================================================================
router.delete("/custom-replies/:id", async (req, res) => {
  try {
    await CustomReply.findByIdAndDelete(req.params.id);
    res.json({ ok: true });
  } catch (err) {
    console.error("Error eliminando custom reply:", err);
    res.status(500).json({ error: "Error eliminando respuesta personalizada." });
  }
});


module.exports = router;
