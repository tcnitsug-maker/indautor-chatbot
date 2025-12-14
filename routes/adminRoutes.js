import express from "express";
import Message from "../models/Message.js";
import CustomReply from "../models/CustomReply.js";
import fetch from "node-fetch";
import PDFDocument from "pdfkit";

const router = express.Router();

// =======================================================================
// 🔐 CAMBIO DE CONTRASEÑA
// POST /admin/change-password
// =======================================================================
import bcrypt from "bcryptjs";
import AdminUser from "../models/AdminUser.js";

router.post("/change-password", async (req, res) => {
  try {
    const adminId = req.admin.id;
    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
      return res.status(400).json({ error: "Faltan datos" });
    }

    const user = await AdminUser.findById(adminId);
    if (!user) {
      return res.status(404).json({ error: "Admin no encontrado" });
    }

    const ok = await bcrypt.compare(currentPassword, user.password);
    if (!ok) {
      return res.status(401).json({ error: "Contraseña actual incorrecta" });
    }

    user.password = newPassword; // se hashea en pre-save
    await user.save();

    res.json({ ok: true, message: "Contraseña actualizada" });
  } catch (err) {
    console.error("change-password:", err);
    res.status(500).json({ error: "Error cambiando contraseña" });
  }
});

// =======================================================================
// 1. HISTORIAL GENERAL
// GET /admin/messages
// =======================================================================
router.get("/messages", async (req, res) => {
  try {
    const msgs = await Message.find().sort({ createdAt: -1 }).lean();
    res.json(msgs);
  } catch (err) {
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
    res.setHeader(
      "Content-Disposition",
      'attachment; filename="historial_chat.csv"'
    );

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
  res.setHeader(
    "Content-Disposition",
    'attachment; filename="respuestas_personalizadas.pdf"'
  );

  const doc = new PDFDocument({ margin: 30 });
  doc.pipe(res);

  doc.fontSize(18).text("Respuestas Personalizadas INDARELÍN", {
    align: "center",
  });
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

  msgs.forEach((m) => {
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
// ✅ EXPORT FINAL (OBLIGATORIO)
// =======================================================================
export default router;
