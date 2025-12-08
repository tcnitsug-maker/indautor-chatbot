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
// 3. ENDPOINT DEL CHATBOT
// ------------------------------
app.post("/chat", async (req, res) => {
  const { message } = req.body;

  // Antes de mandar a la IA,
  // Aquí puedes poner tus respuestas manuales si quieres:
  if (message.toLowerCase().includes("hola")) {
    const customResponse = "Hola, ¿en qué puedo ayudarte?";
    
    // Guardar en BD
    await ChatLog.create({
      userMessage: message,
      botResponse: customResponse
    });

    return res.json({ type: "text", content: customResponse });
  }

  // Si no coincide, se envía a tu IA
  try {
    const aiReply = "Aquí llamas a la IA y devuelves su respuesta.";

    // Guardar en BD
    await ChatLog.create({
      userMessage: message,
      botResponse: aiReply
    });

    res.json({ type: "text", content: aiReply });

  } catch (err) {
    res.json({ type: "text", content: "Error procesando la solicitud." });
  }
});

// ------------------------------
app.listen(process.env.PORT, () => {
  console.log(`🚀 Servidor corriendo en puerto ${process.env.PORT}`);
});
