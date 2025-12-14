const mongoose = require("mongoose");

const CustomReplySchema = new mongoose.Schema(
  {
    // Compatibilidad: antes era question/answer/keywords/enabled
    question: String,
    answer: String,
    keywords: [String],
    enabled: { type: Boolean, default: true },

    // Nuevo (PRO)
    trigger: { type: String, index: true },      // palabra/frase principal
    response: String,                             // texto
    priority: { type: Number, default: 1 },        // mayor = más prioridad
    type: { type: String, enum: ["text", "video"], default: "text" },

    // Video: puede ser URL externa o archivo subido
    video_url: String,    // si es YouTube/embed u otra URL
    video_file: String,   // ruta pública: /uploads/videos/xxxx.mp4
    video_name: String    // nombre original
  },
  { timestamps: true }
);

// Normaliza datos para mantener compatibilidad
CustomReplySchema.pre("save", function (next) {
  if (!this.trigger && this.question) this.trigger = this.question;
  if (!this.response && this.answer) this.response = this.answer;
  if (!this.question && this.trigger) this.question = this.trigger;
  if (!this.answer && this.response) this.answer = this.response;
  next();
});

module.exports = mongoose.model("CustomReply", CustomReplySchema);
