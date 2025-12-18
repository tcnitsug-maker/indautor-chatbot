const express = require("express");
const cors = require("cors");
const path = require("path");

const app = express();

/* =========================
   MIDDLEWARE BASE
========================= */
app.use(cors());
app.use(express.json());

/* =========================
   FIX MIME TYPES (CORB)
========================= */
app.use((req, res, next) => {
  if (req.path.endsWith(".js")) {
    res.type("application/javascript");
  }
  if (req.path.endsWith(".css")) {
    res.type("text/css");
  }
  next();
});

/* =========================
   ⚠️ ESTÁTICOS SIEMPRE PRIMERO
========================= */
app.use(express.static(path.join(__dirname, "public")));
