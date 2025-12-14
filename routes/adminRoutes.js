// routes/adminRoutes.js
const express = require("express");
const router = express.Router();

// =====================
// Helpers: permisos
// =====================
const ROLE_ORDER = ["support","analyst","editor","super"];
function roleAtLeast(userRole, requiredRole) {
  const u = normalizeRole(userRole);
  // normalizeRole devuelve: support/analyst/editor/super
  const order = ROLE_ORDER;
  return order.indexOf(u) >= order.indexOf(requiredRole);
}
function requireRole(requiredRole) {
  return (req, res, next) => {
    if (!req.admin) return res.status(401).json({ error: "No autorizado" });
    if (!roleAtLeast(req.admin.role, requiredRole)) {
      return res.status(403).json({ error: "Permisos insuficientes" });
    }
    next();
  };
}

const Message = require("../models/Message");
const CustomReply = require("../models/CustomReply");
const fetch = require("node-fetch");
const PDFDocument = require("pdfkit"); // npm install pdfkit
const path = require("path");
const fs = require("fs");
const multer = require("multer");
const { v4: uuidv4 } = require("uuid");
const VideoAsset = require("../models/VideoAsset");
const { normalizeRole } = require("../middleware/authAdmin");


// =======================================================================
// 1. GET /admin/messages  → Historial general con filtros
//    Query params opcionales: ?from=YYYY-MM-DD&to=YYYY-MM-DD&ip=&role=&q=
// =======================================================================
router.get("/messages", async (req, res) => {
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
router.get("/messages/export-csv", async (req, res) => {
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
// 3. GET /admin/custom-replies → Listar respuestas personalizadas (ordenadas por prioridad)
//    Permisos: analyst+
// =======================================================================
router.get("/custom-replies", requireRole("analyst"), async (req, res) => {
  try {
    const replies = await CustomReply.find().sort({ priority: -1, createdAt: -1 }).lean();
    res.json(replies);
  } catch (err) {
    console.error("Error obteniendo custom replies:", err);
    res.status(500).json({ error: "No se pudieron obtener las respuestas personalizadas." });
  }
});

// =======================================================================
// 4. POST /admin/custom-replies → Crear respuesta personalizada
//    Permisos: editor+
// =======================================================================
router.post("/custom-replies", requireRole("editor"), async (req, res) => {
  try {
    const {
      trigger, response, keywords = [], enabled = true,
      priority = 1, type = "text", video_url = "", video_file = "", video_name = ""
    } = req.body || {};

    if (!trigger || !response) {
      return res.status(400).json({ error: "Faltan trigger o response" });
    }

    const r = await CustomReply.create({
      trigger, response,
      question: trigger,
      answer: response,
      keywords: Array.isArray(keywords) ? keywords : String(keywords).split(",").map(s => s.trim()).filter(Boolean),
      enabled: !!enabled,
      priority: Number(priority) || 1,
      type: type === "video" ? "video" : "text",
      video_url: video_url || "",
      video_file: video_file || "",
      video_name: video_name || ""
    });

    res.json(r);
  } catch (err) {
    console.error("Error creando custom reply:", err);
    res.status(500).json({ error: "No se pudo crear la respuesta personalizada." });
  }
});

// =======================================================================
// 5. PUT /admin/custom-replies/:id → Editar respuesta personalizada
//    Permisos: editor+
// =======================================================================
router.put("/custom-replies/:id", requireRole("editor"), async (req, res) => {
  try {
    const update = { ...req.body };

    if (update.trigger && !update.question) update.question = update.trigger;
    if (update.response && !update.answer) update.answer = update.response;
    if (update.question && !update.trigger) update.trigger = update.question;
    if (update.answer && !update.response) update.response = update.answer;

    if (update.keywords && !Array.isArray(update.keywords)) {
      update.keywords = String(update.keywords).split(",").map(s => s.trim()).filter(Boolean);
    }

    const r = await CustomReply.findByIdAndUpdate(req.params.id, update, { new: true }).lean();
    res.json(r);
  } catch (err) {
    console.error("Error actualizando custom reply:", err);
    res.status(500).json({ error: "No se pudo actualizar la respuesta personalizada." });
  }
});

// =======================================================================
// 5.1 DELETE /admin/custom-replies/:id → Eliminar respuesta personalizada
//    Permisos: super
// =======================================================================
router.delete("/custom-replies/:id", requireRole("super"), async (req, res) => {
  try {
    await CustomReply.findByIdAndDelete(req.params.id);
    res.json({ ok: true });
  } catch (err) {
    console.error("Error eliminando custom reply:", err);
    res.status(500).json({ error: "No se pudo eliminar la respuesta personalizada." });
  }
});

// =======================================================================
// 6. GET /admin/custom-replies/export-csv → Exportar custom replies CSV
// =======================================================================
// 6. GET /admin/custom-replies/export-csv → Exportar custom replies CSV
// =======================================================================

router.get("/custom-replies/export-csv", requireRole("analyst"), async (req, res) => {
  try {
    const replies = await CustomReply.find().sort({ priority: -1, createdAt: -1 }).lean();

    res.setHeader("Content-Type", "text/csv; charset=utf-8");
    res.setHeader("Content-Disposition", "attachment; filename=\"respuestas_personalizadas.csv\"");

    res.write("trigger,response,keywords,enabled,priority,type,video_url,video_file,video_name\n");
    for (const r of replies) {
      const row = [
        (r.trigger || r.question || "").replace(/"/g, '""'),
        (r.response || r.answer || "").replace(/"/g, '""').replace(/\n/g, " "),
        Array.isArray(r.keywords) ? r.keywords.join("|").replace(/"/g, '""') : "",
        r.enabled ? "1" : "0",
        String(r.priority ?? 1),
        (r.type || "text"),
        (r.video_url || "").replace(/"/g, '""'),
        (r.video_file || "").replace(/"/g, '""'),
        (r.video_name || "").replace(/"/g, '""'),
      ];
      res.write("\"" + row.join("\",\"") + "\"\n");
    }
    res.end();
  } catch (err) {
    console.error("Error exportando CSV:", err);
    res.status(500).json({ error: "No se pudo exportar." });
  }
});

// =======================================================================
// 7. GET /admin/custom-replies/export-pdf → Exportar custom replies a PDF
// =======================================================================
router.get("/custom-replies/export-pdf", async (req, res) => {
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
// 10. Historial por IP
// =======================================================================
router.get("/messages/ip/:ip", async (req, res) => {
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
router.get("/stats/top-ips", async (req, res) => {
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
router.get("/stats/top-texts", async (req, res) => {
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

router.get("/blocked-ips", (req, res) => {
  res.json(Array.from(blockedIPs));
});

router.post("/block-ip", (req, res) => {
  const { ip } = req.body;
  if (!ip) return res.status(400).json({ error: "Falta IP" });
  blockedIPs.add(ip);
  res.json({ ok: true, blocked: ip });
});

// =======================================================================
// VIDEOS (biblioteca)
// Permisos:
//  - GET: analyst+
//  - POST upload: editor+
//  - DELETE: super
// =======================================================================
const videosDir = path.join(__dirname, "..", "uploads", "videos");
if (!fs.existsSync(videosDir)) fs.mkdirSync(videosDir, { recursive: true });

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, videosDir),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname || "").toLowerCase();
    cb(null, `${Date.now()}-${uuidv4()}${ext}`);
  },
});
const upload = multer({
  storage,
  limits: { fileSize: 50 * 1024 * 1024 }, // 50MB
  fileFilter: (req, file, cb) => {
    const ok = ["video/mp4", "video/webm", "video/ogg"].includes(file.mimetype);
    if (!ok) return cb(new Error("Formato no soportado. Usa MP4/WebM/OGG."));
    cb(null, true);
  },
});

router.get("/videos", requireRole("analyst"), async (req, res) => {
  const vids = await VideoAsset.find().sort({ createdAt: -1 }).lean();
  res.json(vids);
});

router.post("/videos", requireRole("editor"), upload.single("video"), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: "No se subió archivo" });

    const v = await VideoAsset.create({
      originalName: req.file.originalname,
      filename: req.file.filename,
      mimetype: req.file.mimetype,
      size: req.file.size,
      url: `/uploads/videos/${req.file.filename}`,
      uploadedBy: req.admin?.username || "admin",
    });

    res.json(v);
  } catch (e) {
    console.error("Error subiendo video:", e);
    res.status(500).json({ error: "No se pudo subir el video" });
  }
});

router.delete("/videos/:id", requireRole("super"), async (req, res) => {
  try {
    const v = await VideoAsset.findById(req.params.id);
    if (!v) return res.status(404).json({ error: "No encontrado" });

    // borrar archivo
    const p = path.join(videosDir, v.filename);
    if (fs.existsSync(p)) fs.unlinkSync(p);

    await VideoAsset.findByIdAndDelete(req.params.id);
    res.json({ ok: true });
  } catch (e) {
    console.error("Error borrando video:", e);
    res.status(500).json({ error: "No se pudo eliminar el video" });
  }
});

module.exports = router;
