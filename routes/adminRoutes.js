const express = require("express");
const router = express.Router();
const { getAllMessages, deleteMessage } = require("../controllers/adminController");

const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || "12345";

// Login de admin
router.post("/login", (req, res) => {
  const { password } = req.body;
  res.json({ ok: password === ADMIN_PASSWORD });
});

// Historial de mensajes
router.get("/messages", getAllMessages);

// Eliminar mensaje
router.delete("/messages/:id", deleteMessage);

module.exports = router;
