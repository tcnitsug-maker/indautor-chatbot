// routes/adminRoutes.js
const express = require("express");
const router = express.Router();
const Message = require("../models/Message");
const CustomReply = require("../models/CustomReply");
const fetch = require("node-fetch");
const PDFDocument = require("pdfkit"); // npm install pdfkit

// -----------------------------------------------------------------------
// Roles: support < analyst < editor < super
// `req.admin.role` ya viene normalizado por middleware/authAdmin.js
// -----------------------------------------------------------------------
const ROLE_ORDER = ["support", "analyst", "editor", "super"];

function requireRole(minRole) {
  return (req, res, next) => {
    const userRole = req.admin?.role || "support";
    const u = ROLE_ORDER.indexOf(userRole);
    const r = ROLE_ORDER.indexOf(minRole);
    if (u < r) return res.status(403).json({ error: "Permisos insuficientes" });
    next();
  };
}

// =======================================================================
// 1. GET /admin/messages  → Historial general con filtros
//    Query params opcionales: ?from=YYYY-MM-DD&to=YYYY-MM-DD&ip=&role=&q=
// =======================================================================
router.get("/messages", requireRole("support"), async (req, res) => {
  try {
    const { from, to, ip, role, q } = req.query;
    const filter = {};

    if (from || to) {
      filter.createdAt = {};
      if (from) filter.createdAt.$gte = new Date(from);
      if (to) {
        const d = new Date(to);
        d.setHours(23, 59, 59, 999);
        filter.createdAt.$lte = d;
      }
    }

    if (ip) filter.ip = ip;
    if (role) filter.role = role;
    if (q) filter.text = { $regex: q, $options: "i" };

    const msgs = await Message.find(filter).sort({ createdAt: -1 }).lean();
    res.json(msgs);
  } catch (err) {
    console.error("Error obteniendo mensajes:", err);
    res.status(500).json({ error: "No se pudieron obtener los mensajes." });
  }
});

// =======================================================================
// 2. GET /admin/messages/export-csv  → Exportar historial (con filtros) CSV
// =======================================================================
router.get("/messages/export-csv", requireRole("analyst"), async (req, res) => {
  try {
    const { from, to, ip, role, q } = req.query;
    const filter = {};

    if (from || to) {
      filter.createdAt = {};
      if (from) filter.createdAt.$gte = new Date(from);
      if (to) {
        const d = new Date(to);
        d.setHours(23, 59, 59, 999);
        filter.createdAt.$lte = d;
      }
    }

    if (ip) filter.ip = ip;
    if (role) filter.role = role;
    if (q) filter.text = { $regex: q, $options: "i" };

    const msgs = await Message.find(filter).sort({ createdAt: -1 }).lean();

    res.setHeader("Content-Type", "text/csv; charset=utf-8");
    res.setHeader("Content-Disposition", "attachment; filename=\"historial_chat.csv\"");

    const header = "fecha,ip,rol,texto\n";
    res.write(header);

    for (const m of msgs) {
      const row = [
        (m.createdAt || "").toISOString(),
        m.ip || "",
        m.role || "",
        (m.text || "").replace(/"/g, '""'),
      ]
        .map((v) => `"${v}"`)
        .join(",");
      res.write(row + "\n");
    }

    res.end();
  } catch (err) {
    console.error("Error exportando CSV:", err);
    res.status(500).json({ error: "No se pudo exportar el historial." });
  }
});

// =======================================================================
// 3. GET /admin/custom-replies → Listar respuestas personalizadas
// =======================================================================
router.get("/custom-replies", requireRole("analyst"), async (req, res) => {
  try {
    const replies = await CustomReply.find().lean();
    res.json(replies);
  } catch (err) {
    console.error("Error obteniendo custom replies:", err);
    res.status(500).json({ error: "No se pudieron obtener las respuestas personalizadas." });
  }
});

// =======================================================================
// 4. POST /admin/custom-replies → Crear respuesta personalizada
// =======================================================================
router.post("/custom-replies", requireRole("editor"), async (req, res) => {
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
// 5. DELETE /admin/custom-replies/:id → Eliminar respuesta personalizada
// =======================================================================
router.delete("/custom-replies/:id", requireRole("editor"), async (req, res) => {
  try {
    await CustomReply.findByIdAndDelete(req.params.id);
    res.json({ ok: true });
  } catch (err) {
    console.error("Error eliminando custom reply:", err);
    res.status(500).json({ error: "Error eliminando respuesta personalizada." });
  }
});

// =======================================================================
// 6. GET /admin/custom-replies/export-csv → Exportar custom replies CSV
// =======================================================================
router.get("/custom-replies/export-csv", requireRole("analyst"), async (req, res) => {
  try {
    const replies = await CustomReply.find().lean();

    res.setHeader("Content-Type", "text/csv; charset=utf-8");
    res.setHeader("Content-Disposition", "attachment; filename=\"respuestas_personalizadas.csv\"");

    res.write("pregunta,respuesta,keywords,enabled\n");
    for (const r of replies) {
      const row = [
        (r.question || "").replace(/"/g, '""'),
        (r.answer || "").replace(/"/g, '""'),
        (Array.isArray(r.keywords) ? r.keywords.join("|") : "").replace(/"/g, '""'),
        r.enabled ? "1" : "0",
      ]
        .map((v) => `"${v}"`)
        .join(",");
      res.write(row + "\n");
    }
    res.end();
  } catch (err) {
    console.error("Error exportando custom replies:", err);
    res.status(500).json({ error: "No se pudo exportar custom replies." });
  }
});

// =======================================================================
// 7. GET /admin/custom-replies/export-pdf → Exportar custom replies a PDF
// =======================================================================
router.get("/custom-replies/export-pdf", requireRole("analyst"), async (req, res) => {
  try {
    const replies = await CustomReply.find().lean();
    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", "attachment; filename=\"respuestas_personalizadas.pdf\"");

    const doc = new PDFDocument({ margin: 30 });
    doc.pipe(res);

    doc.fontSize(18).text("Respuestas Personalizadas INDARELÍN", { align: "center" });
    doc.moveDown();

    replies.forEach((r, idx) => {
      doc.fontSize(12).text(`(${idx + 1}) Pregunta: ${r.question || ""}`);
      doc.fontSize(12).text(`Respuesta: ${r.answer || ""}`);
      doc.fontSize(10).text(`Keywords: ${(r.keywords || []).join(", ")}`);
      doc.moveDown();
    });

    doc.end();
  } catch (err) {
    console.error("Error exportando PDF:", err);
    res.status(500).json({ error: "No se pudo exportar PDF." });
  }
});

// =======================================================================
// 8. IPs + estadísticas (igual que antes) + flag de SPAM si total alto
// =======================================================================
router.get("/ips", requireRole("analyst"), async (req, res) => {
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

    // marcar IPs sospechosas de SPAM (ej. más de 100 mensajes)
    const result = Object.values(stats).map((s) => ({
      ...s,
      spam: s.total >= 100,
    }));

    res.json(result);
  } catch (err) {
    console.error("Error obteniendo IPs:", err);
    res.status(500).json({ error: "Error al obtener lista de IPs" });
  }
});

// =======================================================================
// 9. Info IP (geolocalización)
// =======================================================================
router.get("/ipinfo/:ip", requireRole("analyst"), async (req, res) => {
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
// 10. Historial por IP
// =======================================================================
router.get("/messages/ip/:ip", requireRole("analyst"), async (req, res) => {
  try {
    const msgs = await Message.find({ ip: req.params.ip }).sort({ createdAt: -1 }).lean();
    res.json(msgs);
  } catch (err) {
    console.error("Error historial IP:", err);
    res.status(500).json({ error: "No se pudo obtener historial por IP." });
  }
});

// =======================================================================
// 11. Top IPs (para gráficas avanzadas)
// =======================================================================
router.get("/stats/top-ips", requireRole("analyst"), async (req, res) => {
  try {
    const agg = await Message.aggregate([
      { $match: { ip: { $ne: null } } },
      { $group: { _id: "$ip", total: { $sum: 1 } } },
      { $sort: { total: -1 } },
      { $limit: 20 },
    ]);
    res.json(agg);
  } catch (err) {
    console.error("Error top IPs:", err);
    res.status(500).json({ error: "No se pudo obtener top IPs." });
  }
});

// =======================================================================
// 12. Top textos (frases más usadas) - muy simple
// =======================================================================
router.get("/stats/top-texts", requireRole("analyst"), async (req, res) => {
  try {
    const agg = await Message.aggregate([
      { $group: { _id: "$text", total: { $sum: 1 } } },
      { $sort: { total: -1 } },
      { $limit: 20 },
    ]);
    res.json(agg);
  } catch (err) {
    console.error("Error top texts:", err);
    res.status(500).json({ error: "No se pudo obtener top texts." });
  }
});

// =======================================================================
// 13. BLOQUEO MANUAL DE IP (lista negra en memoria)
//     Si quieres guardarlo en DB, luego lo movemos a un modelo.
// =======================================================================
const blockedIPs = new Set();

router.get("/blocked-ips", requireRole("analyst"), (req, res) => {
  res.json(Array.from(blockedIPs));
});

router.post("/block-ip", requireRole("editor"), (req, res) => {
  const { ip } = req.body;
  if (!ip) return res.status(400).json({ error: "Falta IP" });
  blockedIPs.add(ip);
  res.json({ ok: true, blocked: ip });
});

// =======================================================================
// 14. GESTIÓN DE USUARIOS ADMIN (solo SUPER)
// =======================================================================
const AdminUser = require("../models/AdminUser");

// GET /admin/users  -> lista usuarios
router.get("/users", requireRole("super"), async (req, res) => {
  try {
    const users = await AdminUser.find()
      .select("username role active createdAt updatedAt")
      .sort({ createdAt: -1 })
      .lean();
    res.json(users);
  } catch (err) {
    console.error("Error listando users:", err);
    res.status(500).json({ error: "No se pudieron obtener usuarios." });
  }
});

// POST /admin/users  -> crea usuario
router.post("/users", requireRole("super"), async (req, res) => {
  try {
    const { username, password, role } = req.body;
    if (!username || !password) {
      return res.status(400).json({ error: "Faltan datos" });
    }
    const user = await AdminUser.create({
      username,
      password,
      role: role || "support",
      active: true,
    });
    res.json({
      id: user._id,
      username: user.username,
      role: user.role,
      active: user.active,
    });
  } catch (err) {
    console.error("Error creando user:", err);
    if (err.code === 11000) {
      return res.status(400).json({ error: "Usuario ya existe" });
    }
    res.status(500).json({ error: "No se pudo crear usuario" });
  }
});

// PATCH /admin/users/:id  -> actualizar role/active
router.patch("/users/:id", requireRole("super"), async (req, res) => {
  try {
    const { role, active } = req.body;
    const update = {};
    if (role) update.role = role;
    if (typeof active === "boolean") update.active = active;

    const user = await AdminUser.findByIdAndUpdate(req.params.id, update, {
      new: true,
    }).select("username role active");

    if (!user) return res.status(404).json({ error: "Usuario no encontrado" });
    res.json({
      id: user._id,
      username: user.username,
      role: user.role,
      active: user.active,
    });
  } catch (err) {
    console.error("Error actualizando user:", err);
    res.status(500).json({ error: "No se pudo actualizar usuario" });
  }
});
module.exports = router;
