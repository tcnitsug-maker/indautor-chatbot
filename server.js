const express = require("express");
const cors = require("cors");
const mongoose = require("mongoose");
const path = require("path");
require("dotenv").config();

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, "public")));

mongoose
  .connect(process.env.MONGO_URI)
  .then(() => console.log("MongoDB conectado"))
  .catch(console.error);

// Rutas públicas
app.use("/admin-auth", require("./routes/adminAuthRoutes"));

// Middleware admin
const authAdmin = require("./middleware/authAdmin");

// Rutas protegidas
app.use("/admin", authAdmin("viewer"), require("./routes/adminRoutes"));

// Chat
app.post("/chat", require("./controllers/chatController").sendChat);

app.listen(PORT, () =>
  console.log(`Servidor listo en http://localhost:${PORT}`)
);
