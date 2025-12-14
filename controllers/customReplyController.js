const CustomReply = require("../models/CustomReply");

// Listar todas las respuestas
exports.listCustomReplies = async (req, res) => {
  try {
    const replies = await CustomReply.find().sort({ createdAt: -1 });
    res.json(replies);
  } catch (error) {
    console.error("Error listCustomReplies:", error);
    res.status(500).json({ error: "Error obteniendo respuestas personalizadas" });
  }
};

// Crear respuesta
exports.createCustomReply = async (req, res) => {
  try {
    let { question, answer, keywords, enabled } = req.body;

    if (!question || !answer) {
      return res.status(400).json({ error: "Pregunta y respuesta son obligatorias" });
    }

    if (typeof keywords === "string") {
      keywords = keywords
        .split(",")
        .map((k) => k.trim())
        .filter(Boolean);
    }

    const reply = await CustomReply.create({
      question,
      answer,
      keywords: Array.isArray(keywords) ? keywords : [],
      enabled: enabled !== false,
    });

    res.json(reply);
  } catch (error) {
    console.error("Error createCustomReply:", error);
    res.status(500).json({ error: "Error creando respuesta personalizada" });
  }
};

// Actualizar respuesta
exports.updateCustomReply = async (req, res) => {
  try {
    let { question, answer, keywords, enabled } = req.body;

    if (typeof keywords === "string") {
      keywords = keywords
        .split(",")
        .map((k) => k.trim())
        .filter(Boolean);
    }

    const reply = await CustomReply.findByIdAndUpdate(
      req.params.id,
      {
        question,
        answer,
        keywords: Array.isArray(keywords) ? keywords : [],
        enabled: !!enabled,
      },
      { new: true }
    );

    res.json(reply);
  } catch (error) {
    console.error("Error updateCustomReply:", error);
    res.status(500).json({ error: "Error actualizando respuesta personalizada" });
  }
};

// Eliminar respuesta
exports.deleteCustomReply = async (req, res) => {
  try {
    await CustomReply.findByIdAndDelete(req.params.id);
    res.json({ success: true });
  } catch (error) {
    console.error("Error deleteCustomReply:", error);
    res.status(500).json({ error: "Error eliminando respuesta personalizada" });
  }
};
