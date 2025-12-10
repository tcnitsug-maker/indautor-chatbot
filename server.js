const express = require("express");
const cors = require("cors");
const mongoose = require("mongoose");
const path = require("path");
require("dotenv").config();

// Rutas existentes
const chatRoutes = require("./routes/chatRoutes");
const adminRoutes = require("./routes/adminRoutes");
const customReplyRoutes = require("./routes/customReplyRoutes");

const app = express();

// --------------------
// 🔒 CORS seguro
// --------------------
app.use(
  cors({
    origin: [
      "https://utneza.store",
      "https://www.utneza.store"
    ],
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
  })
);

// --------------------
// 📦 Body parser
// --------------------
app.use(express.json());

// --------------------
// 🔌 Conexión MongoDB
// --------------------
mongoose
  .connect(process.env.MONGO_URI)
  .then(() => console.log("MongoDB Atlas conectado"))
  .catch((err) => console.error("Error en MongoDB:", err));

// --------------------
// 🚀 Rutas API
// --------------------
app.use("/chat", chatRoutes);
app.use("/admin", adminRoutes);
app.use("/admin/custom-replies", customReplyRoutes);

// --------------------
// 🗂 Servir archivos estáticos del panel admin
// --------------------
app.use(express.static(path.join(__dirname, "public")));

// --------------------
// 🌐 Ruta del panel administrativo
// --------------------
app.get("/admin-panel", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "admin.html"));
});

// --------------------
// 🟢 Iniciar servidor
// --------------------
const PORT = process.env.PORT || 10000;
app.listen(PORT, () =>
  console.log(`Servidor iniciado en puerto ${PORT}`)
);
