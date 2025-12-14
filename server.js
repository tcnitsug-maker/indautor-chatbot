/*********************************************************
 * SERVER.JS – INDARELÍN (ES MODULES)
 *********************************************************/

import dotenv from "dotenv";
dotenv.config();

import express from "express";
import cors from "cors";
import mongoose from "mongoose";
import path from "path";
import http from "http";
import jwt from "jsonwebtoken";
import { fileURLToPath } from "url";

// =====================
// __dirname en ES Modules
// =====================
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// =====================
// APP + SERVER
// =====================
const app = express();
const server = http.createServer(app);

// =====================
// SOCKET.IO
// =====================
import { Server } from "socket.io";
const io = new Server(server, {
  cors: { origin: "*", methods: ["GET", "POST"] },
});
app.locals.io = io;

// =====================
// CONFIG
// =====================
const PORT = process.env.PORT || 3000;

// =====================
// MIDDLEWARES
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
  .catch((e) => {
    console.error("❌ MongoDB error:", e.message);
    process.exit(1);
  });

// =====================
// HOME
// =====================
app.get("/", (req, res) => {
  res.send("✔ INDARELÍN API OK");
});

// =====================
// HTML ADMIN
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
import adminAuthRoutes from "./routes/adminAuthRoutes.js";
app.use("/admin-auth", adminAuthRoutes);

// =====================
// RUTAS ADMIN PROTEGIDAS
// =====================
import authAdmin from "./middleware/authAdmin.js";
import adminRoutes from "./routes/adminRoutes.js";

app.use("/admin", authAdmin("viewer"), adminRoutes);

// =====================
// CHAT
// =====================
import { sendChat } from "./controllers/chatController.js";
app.post("/chat", sendChat);

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
// START SERVER
// =====================
server.listen(PORT, () => {
  console.log(`🚀 Servidor listo en puerto ${PORT}`);
});
