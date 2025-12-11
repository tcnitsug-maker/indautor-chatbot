const mongoose = require("mongoose");

const MessageSchema = new mongoose.Schema({
  role: { type: String, required: true }, // "user" o "bot"
  text: { type: String, required: true },
  source: { type: String, default: "unknown" }, // gemini / openai / custom
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model("Message", MessageSchema);
