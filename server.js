const express = require("express");
const cors = require("cors");
const mongoose = require("mongoose");
require("dotenv").config();

const chatRoutes = require("./routes/chatRoutes");
const adminRoutes = require("./routes/adminRoutes");

const app = express();

// ====== CORS FIX DEFINITIVO ========
app.use(cors({
  origin: "*",
  methods: ["GET", "POST", "DELETE"],
  allowedHeaders: ["Content-Type"],
}));

app.use(express.json());

// ====== MONGO ========
mongoose.connect(process.env.MONGO_URI)
  .then(() => console.log("MongoDB Atlas conectado"))
  .catch(err => console.error("Error en MongoDB:", err));

// ====== RUTAS ========
app.use("/chat", chatRoutes);
app.use("/admin", adminRoutes);

// ====== SERVIDOR ========
const PORT = process.env.PORT || 10000;
app.listen(PORT, () => console.log("Servidor iniciado en puerto " + PORT));
