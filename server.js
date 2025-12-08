const express = require("express");
const cors = require("cors");
const mongoose = require("mongoose");
require("dotenv").config();
const fetch = require("node-fetch");

const app = express();
app.use(cors());
app.use(express.json());
app.use(express.static("public"));


// ------------------------------
//  CONEXIÓN A MONGODB ATLAS
// ------------------------------
mongoose.connect(process.env.MONGO_URI)
  .then(() => console.log("MongoDB conectado"))
  .catch(err => console.error("Error MongoDB:", err));


// ------------------------------
//  SCHEMA PARA GUARDAR RESPUESTAS
// ------------------------------
const chatSchema = new mongoose.Schema({
  pregunta: String,
  respuesta_manual: String,
  respuesta_ai: String,
  origen: String,
  fecha: { type: Date, default: Date.now }
}, { collection: "respuestas" });

const Respuesta = mongoose.model("Respuesta", chatSchema);


// ------------------------------
//  RESPUESTAS MANUALES
// ------------------------------
const manualResponses = {
  "hola": "¡Hola! Soy el asistente institucional.",
  "horario": "Nuestro horario es de lunes a viernes de 9:00 a 18:00.",
  "contacto": "Puedes contactarnos al correo contacto@institucion.gob.mx"
};

function normalize(text="") {
  return text.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim();
}


// ------------------------------
// MIDDLEWARE DE AUTENTICACIÓN ADMIN
// ------------------------------
function checkAdminPassword(req, res, next) {
  const pass = req.headers["x-admin-pass"];
  if (!pass || pass !== process.env.ADMIN_PASSWORD) {
    return res.status(401).json({ error: "No autorizado" });
  }
  next();
}


// ------------------------------
//  RUTA PRINCIPAL DE CHAT (POST)
// ------------------------------
app.post("/api/chat", async (req, res) => {
  const message = req.body.message?.trim();
  if (!message) return res.json({ response: "No enviaste mensaje." });

  const msgNorm = normalize(message);

  // ¿Existe respuesta manual EXACTA?
  if (manualResponses[msgNorm]) {
    const doc = await Respuesta.create({
      pregunta: message,
      respuesta_manual: manualResponses[msgNorm],
      origen: "manual"
    });
    return res.json({ source: "manual", response: manualResponses[msgNorm] });
  }

  // ¿Coincidencia parcial?
  for (let key of Object.keys(manualResponses)) {
    if (msgNorm.includes(normalize(key))) {
      const doc = await Respuesta.create({
        pregunta: message,
        respuesta_manual: manualResponses[key],
        origen: "manual"
      });
      return res.json({ source: "manual", response: manualResponses[key] });
    }
  }

  // Llamada a OpenAI
  let respuestaIA = "No tengo una respuesta en este momento.";

  try {
    const aiRes = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${process.env.OPENAI_API_KEY}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        messages: [
          { role: "system", content: "Eres un asistente institucional." },
          { role: "user", content: message }
        ]
      })
    });

    const json = await aiRes.json();
    respuestaIA = json.choices?.[0]?.message?.content || respuestaIA;

  } catch(e) {
    console.log("Error IA", e);
  }

  await Respuesta.create({
    pregunta: message,
    respuesta_ai: respuestaIA,
