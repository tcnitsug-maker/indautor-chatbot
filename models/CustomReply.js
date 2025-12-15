const mongoose = require("mongoose");

const CustomReplySchema = new mongoose.Schema(
  {
    // Compatibilidad anterior
    question: String,
    answer: String,
    keywords: { type: [String], default: [] },
    enabled: { type: Boolean, default: true },

    // Actual (panel)
    trigger: { type: String, index: true },
    response: String,
    priority: { type: Number, default: 1 },
    type: { type: String, enum: ["text", "video"], default: "text" },

    // Si usas videos en el futuro
    videoUrl: String,
  },
  { timestamps: true }
);

CustomReplySchema.pre("save", function (next) {
  if (!this.trigger && this.question) this.trigger = this.question;
  if (!this.response && this.answer) this.response = this.answer;
  if (!this.question && this.trigger) this.question = this.trigger;
  if (!this.answer && this.response) this.answer = this.response;
  next();
});

module.exports = mongoose.model("CustomReply", CustomReplySchema);
