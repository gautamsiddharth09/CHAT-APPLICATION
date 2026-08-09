import { useEffect, useMemo, useRef, useState } from "react";
import io from "socket.io-client";
import axios from "axios";
import "./App.css";

const API_URL = "http://localhost:5000/api";
const SOCKET_URL = "http://localhost:5000";

function App() {
  const [username, setUsername] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [onlineUsers, setOnlineUsers] = useState([]);
  const [typingInfo, setTypingInfo] = useState(null);
  const [error, setError] = useState("");
  const [status, setStatus] = useState("");
  const socketRef = useRef(null);
  const messageEndRef = useRef(null);

  const socket = useMemo(() => {
    if (!displayName) return null;
    return io(SOCKET_URL, { transports: ["websocket"] });
  }, [displayName]);

  useEffect(() => {
    const savedName = localStorage.getItem("chatUsername");
    if (savedName) {
      setDisplayName(savedName);
    }
  }, []);

  useEffect(() => {
    if (!displayName || !socket) return;

    socketRef.current = socket;

    socket.emit("join", { username: displayName });

    socket.on("onlineUsers", (users) => {
      setOnlineUsers(users);
    });

    socket.on("userStatus", ({ username: user, status: userStatus }) => {
      setStatus(`${user} is ${userStatus}`);
      setTimeout(() => setStatus(""), 3000);
    });

    socket.on("typing", ({ username: user, isTyping }) => {
      setTypingInfo(isTyping ? `${user} is typing...` : null);
    });

    socket.on("newMessage", (message) => {
      setMessages((prev) => [...prev, message]);
    });

    socket.on("messageRead", (message) => {
      setMessages((prev) =>
        prev.map((m) => (m._id === message._id ? message : m)),
      );
    });

    socket.on("connect_error", (err) => {
      console.error("Socket connect_error:", err);
      setError("Unable to connect to chat server.");
    });

    return () => {
      socket.disconnect();
    };
  }, [displayName, socket]);

  useEffect(() => {
    fetchMessages();
  }, []);

  useEffect(() => {
    if (!displayName || !socketRef.current) return;

    const unread = messages.filter(
      (message) => message.sender !== displayName && !message.read,
    );

    unread.forEach((message) => {
      socketRef.current.emit("messageRead", { messageId: message._id });
    });
  }, [displayName, messages]);

  useEffect(() => {
    messageEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  async function fetchMessages() {
    try {
      const response = await axios.get(`${API_URL}/messages`);
      setMessages(response.data);
    } catch (err) {
      console.error(err);
      setError("Could not load messages.");
    }
  }

  async function handleSendMessage(e) {
    e.preventDefault();
    if (!input.trim() || !displayName) return;

    const payload = { sender: displayName, content: input.trim() };

    try {
      socketRef.current?.emit("sendMessage", payload, (response) => {
        if (response?.status !== "ok") {
          setError(response?.message || "Message failed to send.");
        }
      });
      setInput("");
      socketRef.current?.emit("typing", {
        username: displayName,
        isTyping: false,
      });
    } catch (err) {
      console.error(err);
      setError("Message delivery failed.");
    }
  }

  function handleTyping(value) {
    setInput(value);
    socketRef.current?.emit("typing", {
      username: displayName,
      isTyping: Boolean(value),
    });
  }

  function handleLogin(e) {
    e.preventDefault();
    if (!username.trim()) return;
    const cleanName = username.trim();
    setDisplayName(cleanName);
    localStorage.setItem("chatUsername", cleanName);
    setUsername("");
  }

  return (
    <div className="app-shell">
      <div className="chat-panel">
        {!displayName ? (
          <form className="login-card" onSubmit={handleLogin}>
            <h2>Enter a username</h2>
            <input
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="Username"
              aria-label="Username"
            />
            <button type="submit">Join Chat</button>
          </form>
        ) : (
          <>
            <header className="chat-header">
              <div>
                <h1>Live Chat</h1>
                <p>
                  Logged in as <strong>{displayName}</strong>
                </p>
              </div>
              <div className="status-pill">{onlineUsers.length} online</div>
            </header>

            <section className="chat-content">
              <div className="messages-list">
                {messages.map((msg) => (
                  <article
                    key={msg._id}
                    className={
                      msg.sender === displayName ? "message own" : "message"
                    }
                  >
                    <div className="message-meta">
                      <strong>{msg.sender}</strong>
                      <span>
                        {new Date(msg.createdAt).toLocaleTimeString([], {
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </span>
                    </div>
                    <p>{msg.content}</p>
                    <div className="message-status">
                      {msg.read ? "Read" : msg.delivered ? "Delivered" : "Sent"}
                    </div>
                  </article>
                ))}
                <div ref={messageEndRef} />
              </div>
              <div className="typing-indicator">{typingInfo}</div>
            </section>

            <form className="composer" onSubmit={handleSendMessage}>
              <input
                value={input}
                onChange={(e) => handleTyping(e.target.value)}
                placeholder="Type a message..."
                aria-label="Message"
              />
              <button type="submit">Send</button>
            </form>
            {error && <div className="error-box">{error}</div>}
            {status && <div className="info-box">{status}</div>}
          </>
        )}
      </div>
      <aside className="sidebar">
        <div className="sidebar-card">
          <h2>Active users</h2>
          <ul>
            {onlineUsers.map((user) => (
              <li key={user}>{user}</li>
            ))}
          </ul>
        </div>
      </aside>
    </div>
  );
}

export default App;
