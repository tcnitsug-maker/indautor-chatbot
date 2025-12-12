const mongoose = require("mongoose");

const MessageSchema = new mongoose.Schema({
  role: String,
  text: String,
  ip: String,
  source: String,
  createdAt: { type: Date, default: Date.now },
});

module.exports = mongoose.model("Message", MessageSchema);
