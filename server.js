const express = require("express");
const cors = require("cors");
const mongoose = require("mongoose");
require("dotenv").config();

const app = express();
app.use(cors());
app.use(express.json());

// ------------------------------
// 1. CONEXIÓN A MONGODB ATLAS
// ------------------------------
mongoose.connect(process.env.MONGO_URI)
  .then(() => console.log("✅ Conectado a MongoDB Atlas"))
  .catch(err => console.error("❌ Error al conectar MongoDB:", err));

// ------------------------------
// 2. MODELO PARA GUARDAR RESPUESTAS
// ------------------------------
const chatSchema = new mongoose.Schema({
  userMessage: String,
  botResponse: String,
  timestamp: { type: Date, default: Date.now }
});

const ChatLog = mongoose.model("ChatLog", chatSchema);

// ------------------------------
// 3. ENDPOINT PARA EL CHATBOT
// ------------------------------
app.post("/chat", async (req, res) => {
  const { message } = req.body;

  // RESPUESTAS MANUALES ANTES QUE LA IA
  if (message.toLowerCase().includes("hola")) {
    const customResponse = "Hola, ¿en qué puedo ayudarte?";

    await ChatLog.create({
      userMessage: message,
      botResponse: customResponse
    });

    return res.json({ type: "text", content: customResponse });
  }

  // Si no coincide mandas a la IA
  const aiReply = "Aquí iría la respuesta de la IA.";

  await ChatLog.create({
    userMessage: message,
    botResponse: aiReply
  });

  res.json({ type: "text", content: aiReply });
});

// ------------------------------
// 4. ENDPOINT PARA LEER TODAS LAS RESPUESTAS (ADMIN PANEL)
// ------------------------------
app.get("/admin/responses", async (req, res) => {
  const results = await ChatLog.find().sort({ timestamp: -1 });
  res.json(results);
});

// ------------------------------
// 5. LEVANTAR SERVIDOR
// ------------------------------
app.listen(process.env.PORT || 3000, () =>
  console.log(`🚀 Servidor corriendo en puerto ${process.env.PORT || 3000}`)
);
