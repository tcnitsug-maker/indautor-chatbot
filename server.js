const express = require("express");
const cors = require("cors");
const path = require("path");

const app = express(); // ✅ APP SE DEFINE AQUÍ

// --------------------
// MIDDLEWARE BÁSICO
// --------------------
app.use(cors());
app.use(express.json());

// --------------------
// FIX MIME TYPES (CORB)
// --------------------
app.use((req, res, next) => {
  if (req.url.endsWith(".js")) {
    res.setHeader("Content-Type", "application/javascript; charset=UTF-8");
  }
  if (req.url.endsWith(".css")) {
    res.setHeader("Content-Type", "text/css; charset=UTF-8");
  }
  next();
});

// --------------------
// ARCHIVOS ESTÁTICOS
// --------------------
app.use(express.static(path.join(__dirname, "public")));

// --------------------
// RUTAS API (EJEMPLO)
// --------------------
// app.use("/chat", require("./routes/chatRoutes"));
// app.use("/admin", require("./routes/adminRoutes"));
// app.use("/metrics", require("./routes/metricsRoutes"));

// --------------------
// HEALTH CHECK
// --------------------
app.get("/health", (req, res) => {
  res.json({ ok: true });
});

// --------------------
// START SERVER
// --------------------
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log("🚀 INDARELÍN backend running on port", PORT);
});

