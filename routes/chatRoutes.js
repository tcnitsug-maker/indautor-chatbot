const express = require("express");
const router = express.Router();
const { sendChat } = require("../controllers/chatController");

router.post("/", sendChat);

module.exports = router;
