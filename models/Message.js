const mongoose = require("mongoose");

const MessageSchema = new mongoose.Schema(
  {
    role: { type: String, required: true }, // "user" o "bot"
    text: { type: String, required: true },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Message", MessageSchema);
