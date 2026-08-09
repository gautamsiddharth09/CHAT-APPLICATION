import express from "express";
import {
  fetchMessages,
  createMessage,
} from "../controllers/messageController.js";

const router = express.Router();

router.get("/", fetchMessages);
router.post("/", createMessage);

export default router;
