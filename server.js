const express = require("express");
const cors = require("cors");
const mongoose = require("mongoose");
require("dotenv").config();

const chatRoutes = require("./routes/chatRoutes");
const adminRoutes = require("./routes/adminRoutes");

const app = express();

// CORS: permite llamadas desde tu dominio
app.use(
  cors({
    origin: ["https://utneza.store", "https://www.utneza.store"],
    methods: ["GET", "POST", "DELETE", "OPTIONS"],
  })
);

app.use(express.json());

mongoose
  .connect(process.env.MONGO_URI)
  .then(() => console.log("MongoDB Atlas conectado"))
  .catch((err) => console.error("Error en MongoDB:", err));

app.use("/chat", chatRoutes);
app.use("/admin", adminRoutes);

const PORT = process.env.PORT || 10000;
app.listen(PORT, () => console.log("Servidor iniciado en puerto " + PORT));
