const express = require("express");
const router = express.Router();

const { 
  getMessages, 
  deleteMessage,
  createCustom,
  updateCustom,
  deleteCustom,
  getCustomReplies,
  loginAdmin,
  getMetrics          // ← AQUÍ
} = require("../controllers/adminController");

router.post("/login", loginAdmin);
router.get("/messages", getMessages);
router.delete("/messages/:id", deleteMessage);

router.get("/custom-replies", getCustomReplies);
router.post("/custom-replies", createCustom);
router.put("/custom-replies/:id", updateCustom);
router.delete("/custom-replies/:id", deleteCustom);

router.get("/metrics", getMetrics);  // ← ESTA RUTA YA NO FALLARÁ

module.exports = router;
