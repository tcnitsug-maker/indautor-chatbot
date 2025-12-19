const Message = require("../models/Message");

exports.getAllMessages = async (req, res) => {
  try {
    const messages = await Message.find().sort({ createdAt: -1 });
    res.json(messages);
  } catch (error) {
    console.error("Error getAllMessages:", error);
    res.status(500).json({ error: "Error obteniendo mensajes" });
  }
};

exports.deleteMessage = async (req, res) => {
  try {
    await Message.findByIdAndDelete(req.params.id);
    res.json({ success: true });
  } catch (error) {
    console.error("Error deleteMessage:", error);
    res.status(500).json({ error: "Error eliminando mensaje" });
  }
};
