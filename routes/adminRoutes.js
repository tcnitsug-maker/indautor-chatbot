// routes/adminRoutes.js
const express = require("express");
const router = express.Router();
const path = require("path");
const fs = require("fs");
const multer = require("multer");
const { v4: uuidv4 } = require("uuid");
const fetch = require("node-fetch");
const PDFDocument = require("pdfkit");
const XLSX = require("xlsx");

// =====================
// Helpers: Imports y Modelos
// =====================
// Ajusta la ruta "../middleware/authAdmin" según tu estructura real
const { normalizeRole } = require("../middleware/authAdmin"); 
const Message = require("../models/Message");
const CustomReply = require("../models/CustomReply");
const AdminUser = require("../models/AdminUser");
const BlockedIP = require("../models/BlockedIP");
const Setting = require("../models/Setting");
const VideoAsset = require("../models/VideoAsset");


// =====================
// Helpers: Permisos
// =====================
router.get(
  "/messages/export-csv",
  authAdmin("support"),
  async (req, res) => {
    try {
      const rows = await Message.find({})
        .sort({ createdAt: -1 })
        .lean();

      res.setHeader("Content-Type", "text/csv; charset=utf-8");
      res.setHeader(
        "Content-Disposition",
        'attachment; filename="historial_chat.csv"'
      );

      let csv = "Fecha,IP,Rol,Mensaje\n";

      rows.forEach(r => {
        csv += `"${new Date(r.createdAt).toISOString()}","${r.ip||""}","${r.role||""}","${(r.text||"").replace(/"/g,'""')}"\n`;
      });

      res.send(csv);
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: "No se pudo exportar CSV" });
    }
  }
);

      const wb = XLSX.utils.book_new();
      const ws = XLSX.utils.json_to_sheet(data);
      XLSX.utils.book_append_sheet(wb, ws, "Mensajes");

      const buffer = XLSX.write(wb, { type: "buffer", bookType: "xlsx" });

      res.setHeader(
        "Content-Type",
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
      );
      res.setHeader(
        "Content-Disposition",
        'attachment; filename="historial_chat.xlsx"'
      );

      res.send(buffer);
    } catch (err) {
      console.error("Error exportando XLSX:", err);
      res.status(500).json({ error: "No se pudo exportar XLSX" });
    }
  }
);
router.get(
  "/messages/export-xlsx",
  authAdmin("support"),
  async (req, res) => {
    try {
      const rows = await Message.find({})
        .sort({ createdAt: -1 })
        .lean();

      const data = rows.map(r => ({
        Fecha: new Date(r.createdAt).toISOString(),
        Rol: r.role || "",
        Mensaje: r.text || "",
        IP: r.ip || "",
        Fuente: r.source || ""
      }));

      const wb = XLSX.utils.book_new();
      const ws = XLSX.utils.json_to_sheet(data);
      XLSX.utils.book_append_sheet(wb, ws, "Mensajes");

      const buffer = XLSX.write(wb, { type: "buffer", bookType: "xlsx" });

      res.setHeader(
        "Content-Type",
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
      );
      res.setHeader(
        "Content-Disposition",
        'attachment; filename="historial_chat.xlsx"'
      );

      res.send(buffer);
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: "No se pudo exportar XLSX" });
    }
  }
);

// =====================
// Helper: Filtro Unificado
// =====================
function buildMessageFilter(query) {
  const { from, to, start, end, ip, role, q, source } = query;
  const filter = {};

  // Unificar fechas
  const startDate = from || start;
  const endDate = to || end;

  if (startDate || endDate) {
    filter.createdAt = {};
    if (startDate) filter.createdAt.$gte = new Date(startDate);
    if (endDate) {
      const d = new Date(endDate);
      d.setHours(23, 59, 59, 999);
      filter.createdAt.$lte = d;
    }
  }

  if (ip) filter.ip = ip;
  if (role) filter.role = role;
  if (source) filter.source = source;
  if (q) filter.text = { $regex: q, $options: "i" };

  return filter;
}


// =======================================================================
// 1. GET /admin/messages → Historial JSON
// =======================================================================
router.get("/messages", requireRole("support"), async (req, res) => {
  try {
    const filter = buildMessageFilter(req.query);
    const msgs = await Message.find(filter).sort({ createdAt: -1 }).lean();
    res.json(msgs);
  } catch (err) {
    console.error("Error obteniendo mensajes:", err);
    res.status(500).json({ error: "No se pudieron obtener los mensajes." });
  }
});


// =======================================================================
// 2. GET /admin/messages/export-csv → Exportar CSV (Con tu formato)
// =======================================================================
router.get("/messages/export-csv", requireRole("support"), async (req, res) => {
  try {
    const filter = buildMessageFilter(req.query);
    const messages = await Message.find(filter).sort({ createdAt: -1 }).lean();

    // Construcción manual del CSV como en tu fragmento
    let csv = "Rol,Mensaje,Fuente,IP,Fecha\n";

    messages.forEach(m => {
      // Usamos m.text que es lo estándar, o m.message por si acaso
      const contenido = (m.text || m.message || "").replace(/"/g, '""').replace(/\n/g, " ");
      const fecha = m.createdAt ? new Date(m.createdAt).toISOString() : "";
      
      csv += `"${m.role || ""}","${contenido}","${m.source || ""}","${m.ip || ""}","${fecha}"\n`;
    });

    res.setHeader("Content-Type", "text/csv; charset=utf-8");
    res.setHeader(
      "Content-Disposition",
      "attachment; filename=historial_chatbot.csv"
    );
    res.send(csv);

  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Error exportando historial" });
  }
});

// =======================================================================
// 3. GET /admin/messages/export-xlsx → Exportar XLSX
// =======================================================================
router.get(
  "/messages/export-xlsx",
  requireRole(["support", "analyst", "editor", "super"]),
  async (req, res) => {
    try {
      const filter = buildMessageFilter(req.query);
      const rows = await Message.find(filter)
        .sort({ createdAt: -1 })
        .lean();

      const data = rows.map(r => ({
        Fecha: r.createdAt ? new Date(r.createdAt).toISOString() : "",
        Rol: r.role || "",
        Mensaje: r.text || r.message || "",
        IP: r.ip || "",
        Fuente: r.source || "",
      }));

      const wb = XLSX.utils.book_new();
      const ws = XLSX.utils.json_to_sheet(data);
      XLSX.utils.book_append_sheet(wb, ws, "Mensajes");

      const buffer = XLSX.write(wb, {
        type: "buffer",
        bookType: "xlsx",
      });

      res.setHeader(
        "Content-Type",
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
      );
      res.setHeader(
        "Content-Disposition",
        'attachment; filename="historial_chat.xlsx"'
      );

      res.send(buffer);
    } catch (err) {
      console.error("Error exportando XLSX:", err);
      res.status(500).json({ error: "No se pudo exportar XLSX" });
    }
  }
);

// =======================================================================
// 4. REPORTES EXCEL (Usuarios, IPs) - Solo Super Admin
// =======================================================================

// Exportar Usuarios
router.get("/users/export-xlsx", requireRole("super"), async (req, res) => {
  try {
    const rows = await AdminUser.find().select("username role active createdAt updatedAt").lean();
    const data = rows.map(u => ({
      Usuario: u.username,
      Rol: u.role,
      Activo: u.active ? "Sí" : "No",
      Creado: u.createdAt ? new Date(u.createdAt).toISOString() : "",
      Actualizado: u.updatedAt ? new Date(u.updatedAt).toISOString() : "",
    }));

    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.json_to_sheet(data);
    XLSX.utils.book_append_sheet(wb, ws, "Usuarios");

    const buf = XLSX.write(wb, { type: "buffer", bookType: "xlsx" });
    res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
    res.setHeader("Content-Disposition", "attachment; filename=usuarios.xlsx");
    res.send(buf);
  } catch (e) {
    res.status(500).json({ error: "Error exportando usuarios" });
  }
});

// Exportar IPs Bloqueadas
router.get("/blocked-ips/export-xlsx", requireRole("super"), async (req, res) => {
  try {
    const rows = await BlockedIP.find().sort({ updatedAt: -1 }).lean();
    const data = rows.map(r => ({
      IP: r.ip,
      Activo: r.active ? "Bloqueada" : "Desbloqueada",
      Motivo: r.reason || "",
      Creado: r.createdAt ? new Date(r.createdAt).toISOString() : "",
    }));
    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.json_to_sheet(data);
    XLSX.utils.book_append_sheet(wb, ws, "IPs");
    const buf = XLSX.write(wb, { type: "buffer", bookType: "xlsx" });
    res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
    res.setHeader("Content-Disposition", "attachment; filename=ips_bloqueadas.xlsx");
    res.send(buf);
  } catch (e) {
    res.status(500).json({ error: "Error exportando IPs" });
  }
});


// =======================================================================
// 5. GESTIÓN DE RESPUESTAS PERSONALIZADAS (Custom Replies)
// =======================================================================

// Listar
router.get("/custom-replies", requireRole("analyst"), async (req, res) => {
  try {
    const replies = await CustomReply.find().sort({ priority: -1, createdAt: -1 }).lean();
    res.json(replies);
  } catch (err) {
    res.status(500).json({ error: "Error obteniendo respuestas." });
  }
});

// Crear
router.post("/custom-replies", requireRole("editor"), async (req, res) => {
  try {
    const { trigger, response, keywords = [], enabled = true, priority = 1, type = "text", video_url } = req.body;
    if (!trigger || !response) return res.status(400).json({ error: "Faltan datos obligatorios" });

    const r = await CustomReply.create({
      trigger, response,
      question: trigger, answer: response, // Compatibilidad
      keywords: Array.isArray(keywords) ? keywords : String(keywords).split(",").map(s=>s.trim()),
      enabled: !!enabled,
      priority: Number(priority),
      type, video_url
    });
    res.json(r);
  } catch (e) {
    res.status(500).json({ error: "Error creando respuesta" });
  }
});

// Editar
router.put("/custom-replies/:id", requireRole("editor"), async (req, res) => {
  try {
    const update = { ...req.body };
    if (update.trigger) update.question = update.trigger;
    if (update.response) update.answer = update.response;
    
    const r = await CustomReply.findByIdAndUpdate(req.params.id, update, { new: true });
    res.json(r);
  } catch (e) {
    res.status(500).json({ error: "Error actualizando respuesta" });
  }
});

// Eliminar
router.delete("/custom-replies/:id", requireRole("super"), async (req, res) => {
  try {
    await CustomReply.findByIdAndDelete(req.params.id);
    res.json({ ok: true });
  } catch (e) {
    res.status(500).json({ error: "Error eliminando respuesta" });
  }
});

// Plantilla Excel
router.get("/custom-replies/template-xlsx", requireRole("analyst"), async (req, res) => {
  try {
    const rows = [{ trigger: "ejemplo", response: "respuesta", keywords: "test", enabled: 1, priority: 5, type: "text" }];
    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.json_to_sheet(rows);
    XLSX.utils.book_append_sheet(wb, ws, "replies");
    const buf = XLSX.write(wb, { type: "buffer", bookType: "xlsx" });
    res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
    res.setHeader("Content-Disposition", 'attachment; filename="plantilla.xlsx"');
    res.end(buf);
  } catch (e) { res.status(500).json({ error: "Error generando plantilla" }); }
});

// Importar Excel
const excelUpload = multer({ storage: multer.memoryStorage() });
router.post("/custom-replies/import-excel", requireRole("editor"), excelUpload.single("file"), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: "Falta archivo" });
    const wb = XLSX.read(req.file.buffer, { type: "buffer" });
    const ws = wb.Sheets[wb.SheetNames[0]];
    const rows = XLSX.utils.sheet_to_json(ws, { defval: "" });
    let created = 0, updated = 0;
    
    for (const raw of rows) {
      const trigger = String(raw.trigger || raw.pregunta || "").trim();
      const response = String(raw.response || raw.respuesta || "").trim();
      if (!trigger || !response) continue;

      const data = {
        trigger, response, question: trigger, answer: response,
        keywords: String(raw.keywords || "").split(","),
        enabled: raw.enabled !== "0",
        priority: Number(raw.priority) || 1,
        type: raw.type || "text",
        video_url: raw.video_url || ""
      };

      const exists = await CustomReply.findOne({ trigger });
      if (exists) {
        await CustomReply.updateOne({ _id: exists._id }, data);
        updated++;
      } else {
        await CustomReply.create(data);
        created++;
      }
    }
    res.json({ ok: true, created, updated });
  } catch (e) { res.status(500).json({ error: "Error importando excel" }); }
});


// =======================================================================
// 6. ESTADÍSTICAS Y BLOQUEOS
// =======================================================================
router.get("/ips", async (req, res) => {
  try {
    const agg = await Message.aggregate([
      { $match: { ip: { $ne: null } } },
      { $group: { _id: "$ip", total: { $sum: 1 }, lastSeen: { $max: "$createdAt" } } },
      { $sort: { total: -1 } }
    ]);
    res.json(agg.map(x => ({ ip: x._id, total: x.total, lastSeen: x.lastSeen, spam: x.total > 100 })));
  } catch (e) { res.status(500).json({ error: "Error IPs" }); }
});

router.post("/block-ip", requireRole("super"), async (req, res) => {
  try {
    const { ip, reason } = req.body;
    await BlockedIP.findOneAndUpdate({ ip }, { active: true, reason, updatedAt: new Date() }, { upsert: true });
    res.json({ ok: true });
  } catch (e) { res.status(500).json({ error: "Error bloqueando IP" }); }
});

router.post("/unblock-ip", requireRole("super"), async (req, res) => {
  try {
    const { ip } = req.body;
    await BlockedIP.findOneAndUpdate({ ip }, { active: false, updatedAt: new Date() });
    res.json({ ok: true });
  } catch (e) { res.status(500).json({ error: "Error desbloqueando IP" }); }
});


// =======================================================================
// 7. GESTIÓN DE USUARIOS ADMIN (Profile & CRUD)
// =======================================================================
router.get("/profile", async (req, res) => {
  const u = await AdminUser.findById(req.admin.id).select("-password");
  res.json(u);
});

router.put("/profile/password", async (req, res) => {
  const { currentPassword, newPassword } = req.body;
  const user = await AdminUser.findById(req.admin.id);
  if (!user || !(await user.comparePassword(currentPassword))) return res.status(401).json({ error: "Pass incorrecto" });
  if (newPassword.length < 6) return res.status(400).json({ error: "Muy corta" });
  user.password = newPassword;
  await user.save();
  res.json({ ok: true });
});

router.get("/users", requireRole("super"), async (req, res) => {
  const users = await AdminUser.find().select("-password").sort({ createdAt: -1 });
  res.json(users);
});

router.post("/users", requireRole("super"), async (req, res) => {
  try {
    const { username, password, role } = req.body;
    if (await AdminUser.findOne({ username })) return res.status(409).json({ error: "Existe" });
    await AdminUser.create({ username, password, role });
    res.json({ ok: true });
  } catch (e) { res.status(500).json({ error: "Error creando usuario" }); }
});

router.put("/users/:id", requireRole("super"), async (req, res) => {
  try {
    await AdminUser.findByIdAndUpdate(req.params.id, req.body);
    res.json({ ok: true });
  } catch (e) { res.status(500).json({ error: "Error editando usuario" }); }
});

router.put("/users/:id/password", requireRole("super"), async (req, res) => {
  try {
    const u = await AdminUser.findById(req.params.id);
    if (!u) return res.status(404).json({ error: "No user" });
    u.password = req.body.newPassword;
    await u.save();
    res.json({ ok: true });
  } catch (e) { res.status(500).json({ error: "Error reset pass" }); }
});

// =======================================================================
// Exportación del Router
// =======================================================================
module.exports = router;
