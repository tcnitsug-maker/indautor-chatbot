const express = require("express");
const cors = require("cors");
const mongoose = require("mongoose");
const path = require("path");
require("dotenv").config();

// RUTAS
const chatRoutes = require("./routes/chatRoutes");
const adminRoutes = require("./routes/adminRoutes");
const customReplyRoutes = require("./routes/customReplyRoutes");
const metricsRoutes = require("./routes/metricsRoutes");  // ← MÉTRICAS
app.use("/admin", require("./routes/adminRoutes"));

const app = express();

// --------------------
// 🔒 CORS CONFIG
// --------------------
const allowedOrigins = [
  "https://utneza.store",
  "https://www.utneza.store",
  "http://localhost:3000",
  "http://127.0.0.1:5500"
];

app.use(
  cors({
    origin: (origin, cb) => {
      if (!origin) return cb(null, true);
      if (allowedOrigins.includes(origin)) return cb(null, true);
      console.warn("CORS BLOCKED:", origin);
      return cb(null, false);
    },
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
  })
);

// --------------------
// 🧩 Middlewares
// --------------------
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// --------------------
// 🗄️ Conexión a MongoDB
// --------------------
const MONGO_URI =
  process.env.MONGO_URI ||
  "mongodb+srv://TU_USER:TU_PASS@TU_CLUSTER.mongodb.net/chatbot";

mongoose
  .connect(MONGO_URI)
  .then(() => console.log("✅ Conectado a MongoDB"))
  .catch((err) => console.error("❌ Error MongoDB:", err));

// --------------------
// 📂 Archivos estáticos (admin panel)
// --------------------
app.use(express.static(path.join(__dirname, "public")));

// --------------------
// 📦 Rutas API
// --------------------
app.use("/chat", chatRoutes);                
app.use("/admin", adminRoutes);             
app.use("/admin/custom-replies", customReplyRoutes); 
app.use("/metrics", metricsRoutes);  // ← HABILITAR MÉTRICAS AQUÍ

// --------------------
// 🌐 Ruta del panel administrativo (HTML)
// --------------------
app.get("/admin-panel", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "admin.html"));
});

// --------------------
// 🟢 Iniciar servidor
// --------------------
const PORT = process.env.PORT || 10000;
app.listen(PORT, () => {
  console.log(`🚀 Servidor escuchando en puerto ${PORT}`);
});
