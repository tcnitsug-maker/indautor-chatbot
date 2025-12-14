
import mongoose from "mongoose";

const CustomReplySchema = new mongoose.Schema({
  trigger: String,
  response: String,
  priority: { type: Number, default: 1 },
  type: { type: String, enum: ["text", "video"], default: "text" },
  video_url: String
}, { timestamps: true });

export default mongoose.model("CustomReply", CustomReplySchema);
