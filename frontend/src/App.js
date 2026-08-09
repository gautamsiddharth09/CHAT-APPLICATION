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

  // Banners for Animated Welcome & Offline/Erase states
  const [welcomeUser, setWelcomeUser] = useState(null);
  const [offlineUser, setOfflineUser] = useState(null);

  const socketRef = useRef(null);
  const messageEndRef = useRef(null);

  // Create socket connection
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

  // Socket event listeners
  useEffect(() => {
    if (!displayName || !socket) return;

    socketRef.current = socket;

    // Join room
    socket.emit("join", {
      username: displayName,
    });

    // Active Users List
    socket.on("onlineUsers", (users) => {
      setOnlineUsers(users);
    });

    // Status Handler (Online / Offline Trigger)
    socket.on(
      "userStatus",
      ({ username: user, status: userStatus }) => {
        setStatus(`${user} is ${userStatus}`);

        if (userStatus === "online" || userStatus === "joined") {
          setWelcomeUser(user);
          setTimeout(() => setWelcomeUser(null), 4000);
        } else if (userStatus === "offline" || userStatus === "left") {
          setOfflineUser(user);
          setTimeout(() => setOfflineUser(null), 4000);
        }

        setTimeout(() => {
          setStatus("");
        }, 3000);
      }
    );

    // Typing
    socket.on("typing", ({ username: user, isTyping }) => {
      setTypingInfo(
        isTyping ? `${user} is typing...` : null
      );
    });

    // Messages
    socket.on("newMessage", (message) => {
      setMessages((prev) => [...prev, message]);
    });

    // Message Read Status
    socket.on("messageRead", (message) => {
      setMessages((prev) =>
        prev.map((m) =>
          m._id === message._id ? message : m
        )
      );
    });

    // Connection Error
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

  // Fetch past messages
  useEffect(() => {
    fetchMessages();
  }, []);

  // Mark messages as read
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

  // Auto scroll to bottom
  useEffect(() => {
    messageEndRef.current?.scrollIntoView({
      behavior: "smooth",
    });
  }, [messages]);

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

    socketRef.current.emit("typing", {
      username: displayName,
      isTyping: false,
    });
  }

  function handleTyping(value) {
    setInput(value);

    if (!socketRef.current) return;

    socketRef.current.emit("typing", {
      username: displayName,
      isTyping: Boolean(value.trim()),
    });
  }

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
    setWelcomeUser(null);
    setOfflineUser(null);
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

          {/* Main Chat Interface */}
          <main className="chat-main">

            {/* Top Animated Alert Overlay Banners */}
            {welcomeUser && (
              <div className="user-banner welcome-banner">
                <span className="banner-glow"></span>
                <span className="banner-icon">✨</span>
                <div className="banner-text">
                  <strong>{welcomeUser}</strong> Joined the chat! Welcome
                </div>
              </div>
            )}

            {offlineUser && (
              <div className="user-banner erase-banner">
                <div className="erase-beam"></div>
                <span className="banner-icon">⚡</span>
                <div className="banner-text">
                  <strong>{offlineUser}</strong> Left the chat (Disconnecting...)
                </div>
              </div>
            )}

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

            {/* Messages Content */}
            <section className="chat-content">
              <div className="messages-list">

                {messages.map((msg, index) => (
                  <article
                    key={msg._id || index}
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

            {/* Composer */}
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

            {/* Errors */}
            {error && (
              <div className="error-box">
                {error}
              </div>
            )}

            {/* Status Info */}
            {status && (
              <div className="info-box">
                {status}
              </div>
            )}

          </main>

          {/* Active Sidebar */}
          <aside className="sidebar">
            <div className="sidebar-card">
              <h2>Active users</h2>

              <ul>
                {onlineUsers.map((user, idx) => (
                  <li key={`${user}-${idx}`}>
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