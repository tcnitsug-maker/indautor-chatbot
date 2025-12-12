// ======================================================
// SERVER.JS COMPLETO - INDARELÍN CHATBOT
// ======================================================

// ------------ IMPORTS GENERALES ------------
const express = require("express");
const cors = require("cors");
const mongoose = require("mongoose");
const path = require("path");
require("dotenv").config();

// ------------ INICIALIZAR SERVIDOR ------------
const app = express();
const PORT = process.env.PORT || 3000;

// ------------ MIDDLEWARES ------------
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// ------------ ARCHIVOS ESTÁTICOS (PANEL ADMIN) ------------
app.use(express.static(path.join(__dirname, "public")));

// ======================================================
// CONEXIÓN A MONGODB
// ======================================================
const MONGO_URI = process.env.MONGO_URI;

if (!MONGO_URI) {
  console.error("❌ ERROR: Falta variable de entorno MONGO_URI");
  process.exit(1);
}

mongoose
  .connect(MONGO_URI)
  .then(() => console.log("✅ Conectado a MongoDB"))
  .catch((err) => console.error("❌ Error conectando a MongoDB:", err));


// ======================================================
// IMPORTAR RUTAS Y CONTROLADORES
// ======================================================

// CHATBOT
const chatController = require("./controllers/chatController");

// ADMIN
const adminRoutes = require("./routes/adminRoutes");


// ======================================================
// RUTAS DEL CHATBOT
// ======================================================

// Endpoint principal del chatbot
app.post("/chat", chatController.sendChat);


// ======================================================
// RUTAS DE PANEL ADMINISTRATIVO
// ======================================================
app.use("/admin", adminRoutes);


// ======================================================
// RUTA HOME (Opcional)
// ======================================================
app.get("/", (req, res) => {
  res.send("✔ INDARELÍN Chatbot API funcionando correctamente.");
});


// ======================================================
// MANEJO DE ERRORES GLOBALES
// ======================================================
app.use((err, req, res, next) => {
  console.error("❌ ERROR INTERNO:", err);
  res.status(500).json({
    error: "Error interno del servidor",
  });
});


// ======================================================
// INICIAR SERVIDOR
// ======================================================
app.listen(PORT, () => {
  console.log(`🚀 Servidor INDARELÍN funcionando en http://localhost:${PORT}`);
});
