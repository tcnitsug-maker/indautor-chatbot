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
const AdminUser = require("../models/AdminUser");
const XLSX = require("xlsx");


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
// 3.1 GET /admin/custom-replies/template-xlsx → Plantilla Excel
//    Permisos: analyst+
// =======================================================================
router.get("/custom-replies/template-xlsx", requireRole("analyst"), async (req, res) => {
  try {
    const rows = [
      {
        trigger: "horario",
        response: "Nuestro horario es de Lunes a Viernes de 9:00 a 17:00.",
        keywords: "horario, atención, servicio",
        enabled: 1,
        priority: 10,
        type: "text",
        video_url: "",
        video_file: "",
        video_name: "",
      },
      {
        trigger: "video informativo",
        response: "Te comparto el video con la explicación.",
        keywords: "video, tutorial",
        enabled: 1,
        priority: 5,
        type: "video",
        video_url: "https://www.youtube.com/embed/XXXX",
        video_file: "",
        video_name: "",
      },
    ];

    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.json_to_sheet(rows);
    XLSX.utils.book_append_sheet(wb, ws, "replies");
    const buf = XLSX.write(wb, { type: "buffer", bookType: "xlsx" });

    res.setHeader(
      "Content-Type",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
    );
    res.setHeader(
      "Content-Disposition",
      'attachment; filename="plantilla_respuestas.xlsx"'
    );
    res.end(buf);
  } catch (err) {
    console.error("Error generando plantilla xlsx:", err);
    res.status(500).json({ error: "No se pudo generar la plantilla." });
  }
});

// =======================================================================
// 3.2 POST /admin/custom-replies/import-excel → Import masivo desde Excel/CSV
//    Permisos: editor+
//    FormData: file
// =======================================================================
const excelUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
});

router.post(
  "/custom-replies/import-excel",
  requireRole("editor"),
  excelUpload.single("file"),
  async (req, res) => {
    try {
      if (!req.file) return res.status(400).json({ error: "Falta archivo" });

      const wb = XLSX.read(req.file.buffer, { type: "buffer" });
      const sheetName = wb.SheetNames[0];
      if (!sheetName) return res.status(400).json({ error: "Archivo sin hojas" });
      const ws = wb.Sheets[sheetName];

      // Normalizar cabeceras: trigger/response/keywords/enabled/priority/type/video_url/video_file/video_name
      const rows = XLSX.utils.sheet_to_json(ws, { defval: "" });

      let created = 0;
      let updated = 0;
      let skipped = 0;
      const errors = [];

      for (let i = 0; i < rows.length; i++) {
        const raw = rows[i] || {};
        // aceptar variantes de columnas
        const trigger = String(raw.trigger || raw.question || raw.pregunta || "").trim();
        const response = String(raw.response || raw.answer || raw.respuesta || "").trim();
        if (!trigger || !response) {
          skipped++;
          continue;
        }

        const keywordsRaw = raw.keywords ?? raw.palabras_clave ?? raw.tags ?? "";
        const keywords = String(keywordsRaw)
          .split(/[,|]/)
          .map((s) => s.trim())
          .filter(Boolean);

        const enabledVal = raw.enabled ?? raw.activo ?? 1;
        const enabled = String(enabledVal).trim() === "0" ? false : !!enabledVal;

        const priority = Number(raw.priority ?? raw.prioridad ?? 1) || 1;
        const typeRaw = String(raw.type ?? raw.tipo ?? "text").toLowerCase();
        const type = typeRaw === "video" ? "video" : "text";

        const video_url = String(raw.video_url ?? raw.videoUrl ?? raw.url_video ?? "").trim();
        const video_file = String(raw.video_file ?? raw.videoFile ?? raw.archivo_video ?? "").trim();
        const video_name = String(raw.video_name ?? raw.videoName ?? raw.nombre_video ?? "").trim();

        try {
          const existing = await CustomReply.findOne({ trigger }).lean();
          if (existing) {
            await CustomReply.updateOne(
              { _id: existing._id },
              {
                $set: {
                  trigger,
                  response,
                  question: trigger,
                  answer: response,
                  keywords,
                  enabled,
                  priority,
                  type,
                  video_url,
                  video_file,
                  video_name,
                },
              }
            );
            updated++;
          } else {
            await CustomReply.create({
              trigger,
              response,
              question: trigger,
              answer: response,
              keywords,
              enabled,
              priority,
              type,
              video_url,
              video_file,
              video_name,
            });
            created++;
          }
        } catch (e) {
          errors.push({ row: i + 2, trigger, error: e.message });
        }
      }

      res.json({ ok: true, created, updated, skipped, errors });
    } catch (err) {
      console.error("Error importando excel:", err);
      res.status(500).json({ error: "No se pudo importar el archivo." });
    }
  }
);

// =======================================================================
// 3.3 GET /admin/profile → Perfil del usuario actual
// =======================================================================
router.get("/profile", async (req, res) => {
  try {
    const u = await AdminUser.findById(req.admin.id).select("username role active createdAt updatedAt").lean();
    if (!u) return res.status(404).json({ error: "Usuario no encontrado" });
    res.json(u);
  } catch (err) {
    console.error("Error profile:", err);
    res.status(500).json({ error: "No se pudo cargar el perfil" });
  }
});

// =======================================================================
// 3.4 PUT /admin/profile/password → Cambiar password (usuario actual)
// =======================================================================
router.put("/profile/password", async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body || {};
    if (!currentPassword || !newPassword) return res.status(400).json({ error: "Faltan datos" });
    if (String(newPassword).length < 6) return res.status(400).json({ error: "La nueva contraseña es muy corta" });

    const user = await AdminUser.findById(req.admin.id);
    if (!user) return res.status(404).json({ error: "Usuario no encontrado" });

    const ok = await user.comparePassword(currentPassword);
    if (!ok) return res.status(401).json({ error: "Contraseña actual incorrecta" });

    user.password = newPassword;
    await user.save();
    res.json({ ok: true });
  } catch (err) {
    console.error("Error change password:", err);
    res.status(500).json({ error: "No se pudo cambiar la contraseña" });
  }
});

// =======================================================================
// 3.5 Usuarios admin (gestión)
//    - GET /admin/users (super)
//    - POST /admin/users (super)
//    - PUT /admin/users/:id (super)
//    - PUT /admin/users/:id/password (super)
// =======================================================================
router.get("/users", requireRole("super"), async (req, res) => {
  try {
    const users = await AdminUser.find().select("username role active createdAt updatedAt").sort({ createdAt: -1 }).lean();
    res.json(users);
  } catch (err) {
    console.error("Error users list:", err);
    res.status(500).json({ error: "No se pudo listar usuarios" });
  }
});

router.post("/users", requireRole("super"), async (req, res) => {
  try {
    const { username, password, role = "viewer", active = true } = req.body || {};
    if (!username || !password) return res.status(400).json({ error: "Faltan username o password" });
    if (String(password).length < 6) return res.status(400).json({ error: "Password muy corta" });

    const exists = await AdminUser.findOne({ username }).lean();
    if (exists) return res.status(409).json({ error: "Ese usuario ya existe" });

    const u = await AdminUser.create({ username, password, role, active: !!active });
    res.json({ ok: true, id: u._id });
  } catch (err) {
    console.error("Error users create:", err);
    res.status(500).json({ error: "No se pudo crear usuario" });
  }
});

router.put("/users/:id", requireRole("super"), async (req, res) => {
  try {
    const { role, active } = req.body || {};
    const update = {};
    if (role) update.role = role;
    if (typeof active === "boolean") update.active = active;

    const u = await AdminUser.findByIdAndUpdate(req.params.id, update, { new: true })
      .select("username role active createdAt updatedAt")
      .lean();
    if (!u) return res.status(404).json({ error: "Usuario no encontrado" });
    res.json({ ok: true, user: u });
  } catch (err) {
    console.error("Error users update:", err);
    res.status(500).json({ error: "No se pudo actualizar usuario" });
  }
});

router.put("/users/:id/password", requireRole("super"), async (req, res) => {
  try {
    const { newPassword } = req.body || {};
    if (!newPassword) return res.status(400).json({ error: "Falta newPassword" });
    if (String(newPassword).length < 6) return res.status(400).json({ error: "Password muy corta" });

    const user = await AdminUser.findById(req.params.id);
    if (!user) return res.status(404).json({ error: "Usuario no encontrado" });
    user.password = newPassword;
    await user.save();
    res.json({ ok: true });
  } catch (err) {
    console.error("Error users reset password:", err);
    res.status(500).json({ error: "No se pudo cambiar password" });
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
