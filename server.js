const express = require("express");
const cors = require("cors");
const mongoose = require("mongoose");
const path = require("path");
const http = require("http");
const jwt = require("jsonwebtoken");
require("dotenv").config();

const app = express();
const server = http.createServer(app);

// SOCKET.IO
const { Server } = require("socket.io");
const io = new Server(server, {
  cors: { origin: "*", methods: ["GET", "POST"] },
});

// Guardamos io para usarlo en controllers
app.locals.io = io;

const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static("public"));

// =====================
// MongoDB
// =====================
mongoose
  .connect(process.env.MONGO_URI)
  .then(() => console.log("✅ MongoDB conectado"))
  .catch((e) => console.error("❌ MongoDB error:", e));

// =====================
// Rutas
// =====================
app.use("/admin-auth", require("./routes/adminAuthRoutes"));

// Middleware admin (HTTP)
const authAdmin = require("./middleware/authAdmin");
app.use("/admin", authAdmin("viewer"), require("./routes/adminRoutes"));

// Chat
app.post("/chat", require("./controllers/chatController").sendChat);

// HOME
app.get("/", (req, res) => res.send("✔ INDARELÍN API OK"));

// =====================
// SOCKET AUTH (Admin)
// =====================
io.use((socket, next) => {
  try {
    const token = socket.handshake.auth?.token;
    if (!token) return next(new Error("NO_TOKEN"));

    const decoded = jwt.verify(token, process.env.ADMIN_JWT_SECRET);

    // Roles permitidos: viewer, admin, superadmin
    const roles = ["viewer", "admin", "superadmin"];
    if (!roles.includes(decoded.role)) return next(new Error("BAD_ROLE"));

    socket.admin = decoded;
    return next();
  } catch (e) {
    return next(new Error("BAD_TOKEN"));
  }
});

io.on("connection", (socket) => {
  console.log("🟢 Admin conectado por socket:", socket.admin?.username);

  socket.on("disconnect", () => {
    console.log("🔴 Admin desconectado:", socket.admin?.username);
  });
});

// =====================
// START
// =====================
server.listen(PORT, () => {
  console.log(`🚀 Servidor listo en http://localhost:${PORT}`);
});
