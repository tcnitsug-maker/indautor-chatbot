
import CustomReply from "../models/CustomReply.js";

export const listReplies = async (req, res) => {
  res.json(await CustomReply.find().sort({ priority: -1 }));
};

export const createReply = async (req, res) => {
  const reply = await CustomReply.create(req.body);
  res.json(reply);
};

export const updateReply = async (req, res) => {
  const reply = await CustomReply.findByIdAndUpdate(req.params.id, req.body, { new: true });
  res.json(reply);
};

export const deleteReply = async (req, res) => {
  await CustomReply.findByIdAndDelete(req.params.id);
  res.json({ ok: true });
};
