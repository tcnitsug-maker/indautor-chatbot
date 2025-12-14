const mongoose = require("mongoose");

const BlockedIPSchema = new mongoose.Schema({
  ip: { type: String, required: true, unique: true, index: true },
  active: { type: Boolean, default: true },
  reason: { type: String, default: "" },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
});

BlockedIPSchema.pre("save", function(next) {
  this.updatedAt = new Date();
  next();
});

module.exports = mongoose.model("BlockedIP", BlockedIPSchema);
