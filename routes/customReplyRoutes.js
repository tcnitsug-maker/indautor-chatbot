const express = require("express");
const router = express.Router();
const {
  listCustomReplies,
  createCustomReply,
  updateCustomReply,
  deleteCustomReply
} = require("../controllers/customReplyController");

router.get("/", listCustomReplies);
router.post("/", createCustomReply);
router.put("/:id", updateCustomReply);
router.delete("/:id", deleteCustomReply);

module.exports = router;
