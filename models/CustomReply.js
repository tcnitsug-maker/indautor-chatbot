cconst mongoose = require("mongoose");

const CustomReplySchema = new mongoose.Schema(
  {
    question: { type: String, required: true },   // Pregunta base
    answer:   { type: String, required: true },   // Respuesta del bot
    keywords: [{ type: String }],                 // Palabras clave opcionales
    enabled:  { type: Boolean, default: true },   // Activada o no
  },
  { timestamps: true }
);

module.exports = mongoose.model("CustomReply", CustomReplySchema);
