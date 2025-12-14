const mongoose = require("mongoose");

const CustomReplySchema = new mongoose.Schema({
  question: String,
  answer: String,
  keywords: [String],
  enabled: { type: Boolean, default: true },
});

module.exports = mongoose.model("CustomReply", CustomReplySchema);
