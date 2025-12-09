const express = require("express");
const cors = require("cors");
const mongoose = require("mongoose");
require("dotenv").config();

const chatRoutes = require("./routes/chatRoutes");
const adminRoutes = require("./routes/adminRoutes");

const app = express();

// CORS seguro para tu dominio
app.use(cors({
  origin: [
    "https://utneza.store",
    "https://www.utneza.store"
  ],
  methods: ["GET", "POST", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"]
}));

app.use(express.json());

// MongoDB Atlas
mongoose.connect(process.env.MONGO_URI)
  .then(() => console.log("MongoDB Atlas conectado"))
  .catch(err => console.error("Error en MongoDB:", err));

// Rutas
app.use("/chat", chatRoutes);
app.use("/admin", adminRoutes);

// Servidor
const PORT = process.env.PORT || 10000;
app.listen(PORT, () => console.log("Servidor iniciado en puerto " + PORT));
