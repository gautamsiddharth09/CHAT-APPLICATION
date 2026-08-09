import Message from "../models/Message.js";

export async function fetchMessages(req, res) {
  try {
    const messages = await Message.find().sort({ createdAt: 1 }).limit(200);
    res.json(messages);
  } catch (error) {
    console.error("Fetch messages error", error);
    res.status(500).json({ error: "Unable to fetch messages" });
  }
}

export async function createMessage(req, res) {
  const { sender, content, room = "global" } = req.body;
  if (!sender || !content) {
    return res.status(400).json({ error: "sender and content are required" });
  }

  try {
    const message = await Message.create({
      sender,
      content,
      room,
      delivered: true,
    });
    res.status(201).json(message);
  } catch (error) {
    console.error("Create message error", error);
    res.status(500).json({ error: "Unable to send message" });
  }
}
