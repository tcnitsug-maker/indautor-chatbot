import mongoose from "mongoose";

const CustomReplySchema = new mongoose.Schema(
  {
    trigger: {
      type: String,
      required: true,
      unique: true,
      trim: true
    },
    response: {
      type: String,
      required: true
    },
    active: {
      type: Boolean,
      default: true
    }
  },
  { timestamps: true }
);

const CustomReply = mongoose.model("CustomReply", CustomReplySchema);

export default CustomReply;

