const express = require("express");
const router = express.Router();

const adminController = require("../controllers/adminController");
const Message = require("../models/Message");
const CustomReply = require("../models/CustomReply");
const fetch = require("node-fetch");
const PDFDocument = require("pdfkit");

// =======================================================================
// 🔐 CAMBIO DE CONTRASEÑA
// POST /admin/change-password
// =======================================================================
router.post("/change-password", adminController.changePassword);

// =======================================================================
// 1. GET /admin/messages  → Historial general con filtros
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
    console.error(err);
    res.status(500).json({ error: "No se pudieron obtener los mensajes" });
  }
});

// =======================================================================
// 2. EXPORTAR HISTORIAL CSV
// =======================================================================
router.get("/messages/export-csv", async (req, res) => {
  try {
    const msgs = await Message.find().sort({ createdAt: -1 }).lean();

    res.setHeader("Content-Type", "text/csv; charset=utf-8");
    res.setHeader("Content-Disposition", "attachment; filename=historial_chat.csv");

    res.write("fecha,ip,rol,texto\n");
    for (const m of msgs) {
      res.write(
        `"${m.createdAt}","${m.ip || ""}","${m.role || ""}","${(m.text || "").replace(/"/g, '""')}"\n`
      );
    }
    res.end();
  } catch (err) {
    res.status(500).json({ error: "Error exportando CSV" });
  }
});

// =======================================================================
// 3. CUSTOM REPLIES
// =======================================================================
router.get("/custom-replies", async (req, res) => {
  const replies = await CustomReply.find().lean();
  res.json(replies);
});

router.post("/custom-replies", async (req, res) => {
  const { question, answer, keywords } = req.body;
  const reply = await CustomReply.create({
    question,
    answer,
    keywords: keywords || [],
    enabled: true,
  });
  res.json(reply);
});

router.delete("/custom-replies/:id", async (req, res) => {
  await CustomReply.findByIdAndDelete(req.params.id);
  res.json({ ok: true });
});

// =======================================================================
// 4. EXPORTAR CUSTOM REPLIES PDF
// =======================================================================
router.get("/custom-replies/export-pdf", async (req, res) => {
  const replies = await CustomReply.find().lean();

  res.setHeader("Content-Type", "application/pdf");
  res.setHeader("Content-Disposition", "attachment; filename=respuestas.pdf");

  const doc = new PDFDocument({ margin: 30 });
  doc.pipe(res);

  doc.fontSize(18).text("Respuestas Personalizadas", { align: "center" });
  doc.moveDown();

  replies.forEach((r, i) => {
    doc.fontSize(12).text(`${i + 1}. ${r.question}`);
    doc.fontSize(10).text(r.answer);
    doc.moveDown();
  });

  doc.end();
});

// =======================================================================
// 5. IPs + SPAM
// =======================================================================
router.get("/ips", async (req, res) => {
  const msgs = await Message.find({}, { ip: 1 }).lean();
  const stats = {};

  msgs.forEach(m => {
    if (!m.ip) return;
    stats[m.ip] = (stats[m.ip] || 0) + 1;
  });

  res.json(
    Object.entries(stats).map(([ip, total]) => ({
      ip,
      total,
      spam: total >= 100,
    }))
  );
});

// =======================================================================
// 6. BLOQUEO DE IP (MEMORIA)
// =======================================================================
const blockedIPs = new Set();

router.get("/blocked-ips", (req, res) => {
  res.json([...blockedIPs]);
});

router.post("/block-ip", (req, res) => {
  const { ip } = req.body;
  if (!ip) return res.status(400).json({ error: "Falta IP" });
  blockedIPs.add(ip);
  res.json({ ok: true });
});

// =======================================================================
// ✅ EXPORT FINAL (SOLO UNA VEZ, AL FINAL)
// =======================================================================
module.exports = router;
