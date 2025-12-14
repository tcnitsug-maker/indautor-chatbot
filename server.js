// =====================
// IMPORTS
// =====================
const express = require("express");
const cors = require("cors");
const mongoose = require("mongoose");
const path = require("path");
const http = require("http");
const jwt = require("jsonwebtoken");
require("dotenv").config();

// =====================
// APP + SERVER
// =====================
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
// ARCHIVOS ESTÁTICOS GENERALES
// =====================
app.use(express.static(path.join(__dirname, "public")));

// =====================
// PANEL ADMIN (BACKEND)
// URL FINAL: /admin-panel
// =====================
app.use(
  "/admin-panel",
  express.static(path.join(__dirname, "public", "admin"))
);
// =====================
// ADMIN PANEL ENTRYPOINT
// =====================
app.get("/admin-panel", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "admin", "index.html"));
});

app.get("/admin-panel/", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "admin", "index.html"));
});

// =====================
// MONGODB
// =====================
mongoose
  .connect(process.env.MONGO_URI)
  .then(() => console.log("✅ MongoDB conectado"))
  .catch((e) => console.error("❌ MongoDB error:", e.message));

// =====================
// AUTH ADMIN (LOGIN)
// =====================
// POST /admin-auth/login
const adminAuthRoutes = require("./routes/adminAuthRoutes");
app.use("/admin-auth", adminAuthRoutes);

// =====================
// RUTAS PROTEGIDAS ADMIN
// =====================
const authAdmin = require("./middleware/authAdmin");
const adminRoutes = require("./routes/adminRoutes");

// viewer = rol mínimo
app.use("/admin", authAdmin("viewer"), adminRoutes);

// =====================
// CHAT
// =====================
const chatController = require("./controllers/chatController");
app.post("/chat", chatController.sendChat);

// =====================
// HOME
// =====================
app.get("/", (req, res) => {
  res.send("✔ INDARELÍN API OK");
});

// =====================
// SOCKET AUTH (ADMIN)
// =====================
io.use((socket, next) => {
  try {
    const token = socket.handshake.auth?.token;
    if (!token) return next(new Error("NO_TOKEN"));

    const decoded = jwt.verify(token, process.env.ADMIN_JWT_SECRET);

    // ROLES REALES DEL SISTEMA
    const roles = ["support", "analyst", "editor", "super"];
    if (!roles.includes(decoded.role)) return next(new Error("BAD_ROLE"));

    socket.admin = decoded;
    next();
  } catch (err) {
    next(new Error("BAD_TOKEN"));
  }
});

io.on("connection", (socket) => {
  console.log("🟢 Admin conectado por socket:", socket.admin?.username);
});

// =====================
// START SERVER
// =====================
server.listen(PORT, () => {
  console.log(`🚀 Servidor INDARELÍN listo en puerto ${PORT}`);
});
