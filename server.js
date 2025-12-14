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

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// 🔴 CAMBIO CRÍTICO AQUÍ
app.use(express.static(path.join(__dirname, "public")));

// =====================
// MongoDB
// =====================
mongoose
  .connect(process.env.MONGO_URI)
  .then(() => console.log("✅ MongoDB conectado"))
  .catch((e) => console.error("❌ MongoDB error:", e));

// =====================
// RUTAS PÚBLICAS HTML (EXPLÍCITAS)
// =====================
app.get("/admin-login.html", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "admin-login.html"));
});

app.get("/admin.html", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "admin.html"));
});

// =====================
// AUTH ADMIN
// =====================
app.use("/admin-auth", require("./routes/adminAuthRoutes"));
app.use("/setup", require("./routes/setupRoutes"));

// =====================
// RUTAS PROTEGIDAS ADMIN
// =====================
const authAdmin = require("./middleware/authAdmin");

app.use("/admin-auth", require("./routes/adminAuthRoutes"));
app.use("/admin", authAdmin("viewer"), require("./routes/adminRoutes"));
app.use("/admin", authAdmin("viewer"), require("./routes/adminRoutes"));

// =====================
// CHAT
// =====================
app.post("/chat", require("./controllers/chatController").sendChat);

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
    const roles = ["viewer", "admin", "superadmin"];
    if (!roles.includes(decoded.role)) return next(new Error("BAD_ROLE"));

    socket.admin = decoded;
    next();
  } catch {
    next(new Error("BAD_TOKEN"));
  }
});

io.on("connection", (socket) => {
  console.log("🟢 Admin conectado:", socket.admin?.username);
});

// =====================
// START
// =====================
server.listen(PORT, () => {
  console.log(`🚀 Servidor listo en puerto ${PORT}`);
});
