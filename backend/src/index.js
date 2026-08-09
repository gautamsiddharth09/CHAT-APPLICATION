import express from "express";
import http from "http";
import { Server } from "socket.io";
import cors from "cors";
import morgan from "morgan";
import dotenv from "dotenv";
import { connectDB } from "./db.js";
import messageRoutes from "./routes/messages.js";
import Message from "./models/Message.js";

dotenv.config();

// const PORT = process.env.PORT;
// const FRONTEND_URL = process.env.FRONTEND_URL;
// // const allowedOrigins = [
// //   FRONTEND_URL,
// //   "http://localhost:3000",

// // ];

// const app = express();
// const server = http.createServer(app);
// const io = new Server(server, {
//   cors: {
//     origin: FRONTEND_URL,
//     methods: ["GET", "POST"],
//   },
// });
// app.use(cors())

// // app.use(cors({ origin: allowedOrigins }));




const PORT = process.env.PORT;
const FRONTEND_URL = process.env.FRONTEND_URL;

const app = express();
const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin: FRONTEND_URL,
    methods: ["GET", "POST"],
  },
});

app.use(cors());

app.use(express.json());
app.use(morgan("dev"));

app.use("/api/messages", messageRoutes);

app.get("/", (req, res) => {
  res.json({ status: "Server is running" });
});

const onlineUsers = new Map();

io.on("connection", (socket) => {
  console.log("Socket connected:", socket.id);

  socket.on("join", ({ username }) => {
    if (!username) return;
    onlineUsers.set(socket.id, username);
    io.emit("onlineUsers", Array.from(new Set(onlineUsers.values())));
    socket.broadcast.emit("userStatus", { username, status: "online" });
  });

  socket.on("typing", ({ username, isTyping }) => {
    socket.broadcast.emit("typing", { username, isTyping });
  });

  socket.on("sendMessage", async (payload, callback) => {
    const { sender, content, room = "global" } = payload;
    if (!sender || !content) {
      return callback?.({
        status: "error",
        message: "sender and content required",
      });
    }

    try {
      const message = await Message.create({
        sender,
        content,
        room,
        delivered: true,
      });
      io.emit("newMessage", message);
      callback?.({ status: "ok", message });
    } catch (error) {
      console.error("Socket sendMessage error", error);
      callback?.({ status: "error", message: "Unable to deliver message" });
    }
  });

  socket.on("messageRead", async ({ messageId }) => {
    if (!messageId) return;

    try {
      const updated = await Message.findByIdAndUpdate(
        messageId,
        { read: true },
        { new: true },
      );
      if (updated) {
        io.emit("messageRead", updated);
      }
    } catch (error) {
      console.error("Socket messageRead error", error);
    }
  });

  socket.on("disconnect", () => {
    const username = onlineUsers.get(socket.id);
    onlineUsers.delete(socket.id);
    if (username) {
      io.emit("onlineUsers", Array.from(new Set(onlineUsers.values())));
      socket.broadcast.emit("userStatus", { username, status: "offline" });
    }
    console.log("Socket disconnected:", socket.id, username);
  });
});

connectDB()
  .then(() =>
    server.listen(PORT, () => console.log(`Server listening on port ${PORT}`)),
  )
  .catch((error) => {
    console.error("Failed to start server", error);
    process.exit(1);
  });
