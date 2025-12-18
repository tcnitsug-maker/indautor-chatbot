const mongoose = require("mongoose");

const VideoAssetSchema = new mongoose.Schema(
  {
    originalName: String,
    filename: String,
    mimetype: String,
    size: Number,
    url: String, // /uploads/videos/xxx.mp4
    uploadedBy: String, // username
  },
  { timestamps: true }
);

module.exports = mongoose.model("VideoAsset", VideoAssetSchema);
