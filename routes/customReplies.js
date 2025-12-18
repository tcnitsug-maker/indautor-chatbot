
import express from "express";
import { listReplies, createReply, updateReply, deleteReply } from "../controllers/customReplyController.js";
import { requireRole } from "../middlewares/requireRole.js";

const router = express.Router();

router.get("/", requireRole(["super", "editor", "analyst"]), listReplies);
router.post("/", requireRole(["super", "editor"]), createReply);
router.put("/:id", requireRole(["super", "editor"]), updateReply);
router.delete("/:id", requireRole(["super"]), deleteReply);

export default router;
