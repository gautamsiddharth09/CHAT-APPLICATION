import { useEffect, useMemo, useRef, useState } from "react";
import io from "socket.io-client";
import axios from "axios";
import "./App.css";

const API_URL = process.env.REACT_APP_API_URL;
const SOCKET_URL = process.env.REACT_APP_SOCKET_URL;

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

  // Create socket when user logs in
  const socket = useMemo(() => {
    if (!displayName) return null;

    return io(SOCKET_URL, {
      transports: ["websocket"],
    });
  }, [displayName]);

  // Load saved username
  useEffect(() => {
    const savedName = localStorage.getItem("chatUsername");

    if (savedName) {
      setDisplayName(savedName);
    }
  }, []);
  

  // Socket connection and listeners
  useEffect(() => {
    if (!displayName || !socket) return;

    socketRef.current = socket;

    // Join chat
    socket.emit("join", {
      username: displayName,
    });

    // Online users
    socket.on("onlineUsers", (users) => {
      setOnlineUsers(users);
    });

    // User status
    socket.on(
      "userStatus",
      ({ username: user, status: userStatus }) => {
        setStatus(`${user} is ${userStatus}`);

        setTimeout(() => {
          setStatus("");
        }, 3000);
      }
    );

    // Typing
    socket.on(
      "typing",
      ({ username: user, isTyping }) => {
        setTypingInfo(
          isTyping ? `${user} is typing...` : null
        );
      }
    );

    // New message
    socket.on("newMessage", (message) => {
      setMessages((prev) => [...prev, message]);
    });

    // Message read
    socket.on("messageRead", (message) => {
      setMessages((prev) =>
        prev.map((m) =>
          m._id === message._id ? message : m
        )
      );
    });

    // Connection error
    socket.on("connect_error", (err) => {
      console.error("Socket connection error:", err);
      setError("Unable to connect to chat server.");
    });

    // Cleanup
    return () => {
      socket.off("onlineUsers");
      socket.off("userStatus");
      socket.off("typing");
      socket.off("newMessage");
      socket.off("messageRead");
      socket.off("connect_error");

      socket.disconnect();
      socketRef.current = null;
    };
  }, [displayName, socket]);

  // Fetch old messages
  useEffect(() => {
    fetchMessages();
  }, []);

  // Mark unread messages as read
  useEffect(() => {
    if (!displayName || !socketRef.current) return;

    const unreadMessages = messages.filter(
      (message) =>
        message.sender !== displayName &&
        !message.read
    );

    unreadMessages.forEach((message) => {
      socketRef.current.emit("messageRead", {
        messageId: message._id,
      });
    });
  }, [displayName, messages]);

  // Auto scroll to latest message
  useEffect(() => {
    messageEndRef.current?.scrollIntoView({
      behavior: "smooth",
    });
  }, [messages]);

  // Fetch messages from backend
  async function fetchMessages() {
    try {
      const response = await axios.get(
        `${API_URL}/messages`
      );

      setMessages(response.data);
    } catch (err) {
      console.error("Fetch messages error:", err);
      setError("Could not load messages.");
    }
  }

  // Send message
  function handleSendMessage(e) {
    e.preventDefault();

    if (!input.trim() || !displayName) return;

    if (!socketRef.current) {
      setError("Socket is not connected.");
      return;
    }

    const payload = {
      sender: displayName,
      content: input.trim(),
    };

    socketRef.current.emit(
      "sendMessage",
      payload,
      (response) => {
        if (response?.status !== "ok") {
          setError(
            response?.message ||
              "Message failed to send."
          );
        }
      }
    );

    setInput("");

    // Stop typing
    socketRef.current.emit("typing", {
      username: displayName,
      isTyping: false,
    });
  }

  // Typing handler
  function handleTyping(value) {
    setInput(value);

    if (!socketRef.current) return;

    socketRef.current.emit("typing", {
      username: displayName,
      isTyping: Boolean(value.trim()),
    });
  }

  // Login
  function handleLogin(e) {
    e.preventDefault();

    if (!username.trim()) return;

    const cleanName = username.trim();

    setDisplayName(cleanName);

    localStorage.setItem(
      "chatUsername",
      cleanName
    );

    setUsername("");
  }

  // Logout
  function handleLogout() {
    localStorage.removeItem("chatUsername");

    if (socketRef.current) {
      socketRef.current.disconnect();
      socketRef.current = null;
    }

    setDisplayName("");
    setMessages([]);
    setOnlineUsers([]);
    setTypingInfo(null);
    setStatus("");
    setError("");
  }

  return (
    <div className="app">

      {!displayName ? (
        <div className="login-container">
          <form
            className="login-form"
            onSubmit={handleLogin}
          >
            <h1>Enter a username</h1>

            <input
              value={username}
              onChange={(e) =>
                setUsername(e.target.value)
              }
              placeholder="Username"
              aria-label="Username"
            />

            <button type="submit">
              Join Chat
            </button>
          </form>
        </div>
      ) : (
        <div className="chat-container">

          {/* Main Chat */}
          <main className="chat-main">

            {/* Header */}
            <header className="chat-header">
              <div>
                <h1>Live Chat</h1>

                <p>
                  Logged in as{" "}
                  <strong>{displayName}</strong>
                </p>
              </div>

              <div className="header-actions">
                <span>
                  {onlineUsers.length} online
                </span>

                <button
                  type="button"
                  onClick={handleLogout}
                >
                  Logout
                </button>
              </div>
            </header>

            {/* Messages */}
            <section className="chat-content">
              <div className="messages-list">

                {messages.map((msg) => (
                  <article
                    key={msg._id}
                    className={
                      msg.sender === displayName
                        ? "message own"
                        : "message"
                    }
                  >
                    <div className="message-meta">
                      <strong>
                        {msg.sender}
                      </strong>

                      <span>
                        {msg.createdAt &&
                          new Date(
                            msg.createdAt
                          ).toLocaleTimeString(
                            [],
                            {
                              hour: "2-digit",
                              minute: "2-digit",
                            }
                          )}
                      </span>
                    </div>

                    <p>{msg.content}</p>

                    <div className="message-status">
                      {msg.read
                        ? "Read"
                        : msg.delivered
                        ? "Delivered"
                        : "Sent"}
                    </div>
                  </article>
                ))}

                <div ref={messageEndRef} />
              </div>

              {/* Typing indicator */}
              <div className="typing-indicator">
                {typingInfo}
              </div>
            </section>

            {/* Message Composer */}
            <form
              className="composer"
              onSubmit={handleSendMessage}
            >
              <input
                value={input}
                onChange={(e) =>
                  handleTyping(e.target.value)
                }
                placeholder="Type a message..."
                aria-label="Message"
              />

              <button type="submit">
                Send
              </button>
            </form>

            {/* Error */}
            {error && (
              <div className="error-box">
                {error}
              </div>
            )}

            {/* Status */}
            {status && (
              <div className="info-box">
                {status}
              </div>
            )}

          </main>

          {/* Sidebar */}
          <aside className="sidebar">
            <div className="sidebar-card">
              <h2>Active users</h2>

              <ul>
                {onlineUsers.map((user) => (
                  <li key={user}>
                    {user}
                  </li>
                ))}
              </ul>
            </div>
          </aside>

        </div>
      )}
    </div>
  );
}

export default App;