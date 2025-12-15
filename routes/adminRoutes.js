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
// Middleware de Auth (JWT)
// =====================
const authAdmin = require("../middleware/authAdmin");

// =====================
// Modelos
// =====================
const Message = require("../models/Message");
const CustomReply = require("../models/CustomReply");
const AdminUser = require("../models/AdminUser");
const BlockedIP = require("../models/BlockedIP");
const Setting = require("../models/Setting");
const VideoAsset = require("../models/VideoAsset");

// =======================================================================
// Helper: Filtro unificado de mensajes
// =======================================================================
function buildMessageFilter(query) {
  const { from, to, start, end, ip, role, q, source } = query;
  const filter = {};

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
// 1. HISTORIAL JSON
// =======================================================================
router.get(
  "/messages",
  authAdmin("support"),
  async (req, res) => {
    try {
      const filter = buildMessageFilter(req.query);
      const msgs = await Message.find(filter).sort({ createdAt: -1 }).lean();
      res.json(msgs);
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: "No se pudieron obtener los mensajes" });
    }
  }
);

// =======================================================================
// 2. EXPORTAR HISTORIAL CSV
// =======================================================================
router.get(
  "/messages/export-csv",
  authAdmin("support"),
  async (req, res) => {
    try {
      const filter = buildMessageFilter(req.query);
      const messages = await Message.find(filter)
        .sort({ createdAt: -1 })
        .lean();

      let csv = "Rol,Mensaje,Fuente,IP,Fecha\n";

      messages.forEach(m => {
        const texto = (m.text || m.message || "")
          .replace(/"/g, '""')
          .replace(/\n/g, " ");
        const fecha = m.createdAt
          ? new Date(m.createdAt).toISOString()
          : "";

        csv += `"${m.role || ""}","${texto}","${m.source || ""}","${m.ip || ""}","${fecha}"\n`;
      });

      res.setHeader("Content-Type", "text/csv; charset=utf-8");
      res.setHeader(
        "Content-Disposition",
        'attachment; filename="historial_chatbot.csv"'
      );
      res.send(csv);
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: "Error exportando historial CSV" });
    }
  }
);

// =======================================================================
// 3. EXPORTAR HISTORIAL XLSX
// =======================================================================
router.get(
  "/messages/export-xlsx",
  authAdmin("support"),
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
      console.error(err);
      res.status(500).json({ error: "Error exportando historial XLSX" });
    }
  }
);

// =======================================================================
// 4. EXPORTES ADMIN (SOLO SUPER)
// =======================================================================
router.get(
  "/users/export-xlsx",
  authAdmin("super"),
  async (req, res) => {
    try {
      const rows = await AdminUser.find()
        .select("username role active createdAt updatedAt")
        .lean();

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
      res.setHeader(
        "Content-Type",
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
      );
      res.setHeader(
        "Content-Disposition",
        'attachment; filename="usuarios.xlsx"'
      );
      res.send(buf);
    } catch (err) {
      res.status(500).json({ error: "Error exportando usuarios" });
    }
  }
);

// =======================================================================
// EXPORT FINAL
// =======================================================================
module.exports = router;
