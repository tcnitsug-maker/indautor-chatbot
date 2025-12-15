const Message = require("../models/Message");
const BlockedIP = require("../models/BlockedIP");
const Setting = require("../models/Setting");
const CustomReply = require("../models/CustomReply");
const fetch = require("node-fetch");

const OPENAI_MODEL = process.env.OPENAI_MODEL || "gpt-4o-mini";
const GEMINI_MODEL = process.env.GEMINI_MODEL || "gemini-2.0-flash";

const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

// ----------------------
// Helpers: normalización y fuzzy matching
// ----------------------
function stripAccents(s = "") {
  return s.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
}
function norm(s = "") {
  return stripAccents(String(s).toLowerCase())
    .repl
