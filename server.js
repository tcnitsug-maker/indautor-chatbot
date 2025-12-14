const express = require("express");
const cors = require("cors");
const mongoose = require("mongoose");
const path = require("path");
const http = require("http");
const jwt = require("jsonwebtoken");
require("dotenv").config();

const app = express();
const server = http.createServer(app);

// =====================
// SOCKET.IO
// =====================
const { Server } = require("socket.io");
const io = new Server(server, {
  cors: { origin: "*", methods: ["GET", "POST"] },
});
app.locals.io = io;

// =====================
// CONFIG
// =====================
const PORT = process.env.PORT || 3000;

// =====================
// MIDDLEWARES GLOBALES
// =====================
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// =====================
// ARCHIVOS ESTÁTICOS
// =====================
app.use(express.static(path.join(__dirname, "public")));

// =====================
// MONGODB
// =====================
mongoose
  .connect(process.env.MONGO_URI)
  .then(() => console.log("✅ MongoDB conectado"))
  .catch((e) => console.error("❌ MongoDB error:", e.message));

// =====================
// HTML PÚBLICO
// =====================
app.get("/admin-login.html", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "admin-login.html"));
});

app.get("/admin.html", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "admin.html"));
});

// =====================
// AUTH ADMIN (LOGIN)
// =====================
// ⚠️ adminAuthRoutes DEBE exportar router con module.exports
const adminAuthRoutes = require("./routes/adminAuthRoutes");
app.use("/admin-auth", adminAuthRoutes);

// =====================
// RUTAS PROTEGIDAS ADMIN
// =====================
const authAdmin = require("./middleware/authAdmin");
// ⚠️ adminRoutes DEBE exportar router con module.exports
const adminRoutes = require("./routes/adminRoutes");

// Nivel mínimo para entrar a /admin: support (lectura limitada)
app.use("/admin", authAdmin("support"), adminRoutes);

// =====================
// CHAT
// =====================
// ⚠️ chatController DEBE exportar { sendChat }
const chatController = require("./controllers/chatController");
app.post("/chat", chatController.sendChat);

// =====================
// HOME
// =====================
app.get("/", (req, res) => {
  res.send("✔ INDARELÍN API OK");
});

// =====================
// SOCKET AUTH
// =====================
io.use((socket, next) => {
  try {
    const token = socket.handshake.auth?.token;
    if (!token) return next(new Error("NO_TOKEN"));

    const decoded = jwt.verify(token, process.env.ADMIN_JWT_SECRET);
    // Compatibilidad con roles legacy
    const { normalizeRole } = require("./middleware/authAdmin");
    const role = normalizeRole(decoded.role);
    if (!["support", "analyst", "editor", "super"].includes(role)) {
      return next(new Error("BAD_ROLE"));
    }

    socket.admin = { ...decoded, role };
    next();
  } catch (err) {
    next(new Error("BAD_TOKEN"));
  }
});

io.on("connection", (socket) => {
  console.log("🟢 Admin conectado:", socket.admin?.username);
});

// =====================
// START SERVER
// =====================
server.listen(PORT, () => {
  console.log(`🚀 Servidor listo en puerto ${PORT}`);
});
