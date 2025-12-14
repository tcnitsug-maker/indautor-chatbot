import mongoose from "mongoose";

const MessageSchema = new mongoose.Schema(
  {
    role: {
      type: String,
      enum: ["user", "assistant", "system"],
      required: true
    },
    content: {
      type: String,
      required: true
    },
    sessionId: {
      type: String,
      index: true
    },
    ip: {
      type: String
    }
  },
  { timestamps: true }
);

const Message = mongoose.model("Message", MessageSchema);

export default Message;
