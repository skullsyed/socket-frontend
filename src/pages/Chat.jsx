import { useContext, useEffect, useState, useRef, useCallback } from "react";
import { SocketContext } from "../context/SocketContext";
import { AuthContext } from "../context/AuthContext";
import { MessageContext } from "../context/MessageContext";
import API from "../api/axiosConfig";

export default function Chat({ selectedUser }) {
  const { socket } = useContext(SocketContext);
  const { user } = useContext(AuthContext);
  const { markAsRead, isUserTyping, emitTyping, emitStoppedTyping } =
    useContext(MessageContext);

  const [message, setMessage] = useState("");
  const [chat, setChat] = useState([]);
  const [loading, setLoading] = useState(false);
  const [isTyping, setIsTyping] = useState(false);

  const messagesEndRef = useRef(null);
  const messagesContainerRef = useRef(null);
  const typingTimeoutRef = useRef(null);
  const lastFetchedUser = useRef(null);

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, []);

  const handleTyping = useCallback(() => {
    if (!selectedUser || !emitTyping) return;

    if (!isTyping) {
      setIsTyping(true);
      emitTyping(selectedUser._id);
    }

    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }

    typingTimeoutRef.current = setTimeout(() => {
      setIsTyping(false);
      emitStoppedTyping(selectedUser._id);
    }, 1000);
  }, [selectedUser, isTyping, emitTyping, emitStoppedTyping]);

  useEffect(() => {
    const fetchMessages = async () => {
      if (!selectedUser || !user) return;

      if (lastFetchedUser.current === selectedUser._id) return;

      lastFetchedUser.current = selectedUser._id;
      markAsRead(selectedUser._id);

      setLoading(true);
      try {
        const res = await API.get("/api/messages/getAllMessage", {
          params: {
            senderId: user._id,
            receiverId: selectedUser._id,
          },
        });

        console.log("Fetched messages:", res.data);
        setChat(res.data || []);
        setTimeout(scrollToBottom, 100);
      } catch (error) {
        console.error("Error fetching messages:", error);
        setChat([]);
      } finally {
        setLoading(false);
      }
    };

    fetchMessages();
  }, [selectedUser?._id, user?._id, markAsRead, scrollToBottom]);

  useEffect(() => {
    if (!socket || !user) return;

    const handlePrivateMessage = (msg) => {
      console.log("Received socket message:", msg);

      if (
        selectedUser &&
        ((msg.senderId === user._id && msg.receiverId === selectedUser._id) ||
          (msg.senderId === selectedUser._id && msg.receiverId === user._id))
      ) {
        setChat((prev) => {
          const messageExists = prev.some(
            (existingMsg) =>
              existingMsg._id === msg._id ||
              (existingMsg.timestamp === msg.timestamp &&
                existingMsg.senderId === msg.senderId &&
                existingMsg.message === msg.message)
          );

          if (messageExists) return prev;

          const newChat = [...prev, msg];
          setTimeout(scrollToBottom, 100);
          return newChat;
        });

        if (msg.senderId === selectedUser._id && markAsRead) {
          markAsRead(selectedUser._id);
        }
      }
    };

    socket.on("private-message", handlePrivateMessage);
    return () => socket.off("private-message", handlePrivateMessage);
  }, [socket, user?._id, selectedUser?._id, markAsRead, scrollToBottom]);

  useEffect(() => {
    if (selectedUser) {
      lastFetchedUser.current = null;
    }
  }, [selectedUser?._id]);

  useEffect(() => {
    scrollToBottom();
  }, [chat, scrollToBottom]);

  useEffect(() => {
    return () => {
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
    };
  }, []);

  const handleMessageChange = (e) => {
    setMessage(e.target.value);
    handleTyping();
  };

  const sendMessage = async () => {
    if (!selectedUser || !message.trim() || !user) return;

    setIsTyping(false);
    emitStoppedTyping(selectedUser._id);
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }

    const msg = {
      senderId: user._id,
      receiverId: selectedUser._id,
      message: message.trim(),
      timestamp: new Date().toISOString(),
    };

    try {
      console.log("Sending message to database:", msg);

      const response = await API.post("/api/messages/createMessage", {
        senderId: msg.senderId,
        receiverId: msg.receiverId,
        message: msg.message,
      });

      console.log("Database response:", response.data);

      const socketMsg = {
        ...response.data,
        text: response.data.message,
      };

      socket.emit("private-message", socketMsg);

      setChat((prev) => {
        const messageExists = prev.some((msg) => msg._id === response.data._id);
        if (messageExists) return prev;
        const newChat = [...prev, response.data];
        setTimeout(scrollToBottom, 50);
        return newChat;
      });

      setMessage("");
    } catch (error) {
      console.error("Error saving message to database:", error);

      const fallbackMsg = {
        ...msg,
        text: msg.message,
        _id: `temp_${Date.now()}`,
      };

      socket.emit("private-message", fallbackMsg);
      setChat((prev) => {
        const newChat = [...prev, fallbackMsg];
        setTimeout(scrollToBottom, 50);
        return newChat;
      });
      setMessage("");

      alert("Message sent but may not be saved to database.");
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  if (!selectedUser) {
    return (
      <div className="container mt-4">
        <div className="row justify-content-center">
          <div className="col-md-8">
            <div className="alert alert-info text-center">
              <i className="bi bi-people-fill display-4 mb-3 d-block"></i>
              <h4 className="alert-heading">Select a user to start chatting</h4>
              <p className="mb-0">
                Choose a user from the list to begin your conversation.
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="container mt-4">
      <div className="card shadow">
        {/* Chat Header */}
        <div className="card-header bg-primary text-white">
          <div className="d-flex align-items-center justify-content-between">
            <div className="d-flex align-items-center">
              <i className="bi bi-chat-dots-fill me-2"></i>
              <h5 className="mb-0">Chat with {selectedUser.name}</h5>
            </div>
            {isUserTyping(selectedUser._id) && (
              <div className="d-flex align-items-center">
                <div
                  className="spinner-grow spinner-grow-sm text-light me-2"
                  role="status"
                >
                  <span className="visually-hidden">Typing...</span>
                </div>
                <small className="text-white-50">typing...</small>
              </div>
            )}
          </div>
        </div>

        {/* Messages Area */}
        <div className="card-body p-0">
          <div
            ref={messagesContainerRef}
            className="p-3 overflow-auto bg-light"
            style={{ height: "400px" }}
          >
            {loading ? (
              <div className="d-flex justify-content-center align-items-center h-100">
                <div className="text-center">
                  <div className="spinner-border text-primary" role="status">
                    <span className="visually-hidden">Loading messages...</span>
                  </div>
                  <p className="mt-2 text-muted">Loading messages...</p>
                </div>
              </div>
            ) : chat.length === 0 ? (
              <div className="d-flex justify-content-center align-items-center h-100">
                <div className="text-center text-muted">
                  <i className="bi bi-chat-square-dots display-1 opacity-50"></i>
                  <p className="mt-3">
                    No messages yet. Start the conversation!
                  </p>
                </div>
              </div>
            ) : (
              <>
                {chat.map((msg, idx) => (
                  <div key={msg._id || `msg_${idx}`} className="mb-3">
                    <div
                      className={`d-flex ${
                        msg.senderId === user._id
                          ? "justify-content-end"
                          : "justify-content-start"
                      }`}
                    >
                      <div
                        className={`p-3 rounded-3 ${
                          msg.senderId === user._id
                            ? "bg-primary text-white"
                            : "bg-white border"
                        }`}
                        style={{ maxWidth: "70%" }}
                      >
                        <div className="fw-bold mb-1 small">
                          {msg.senderId === user._id
                            ? "You"
                            : selectedUser.name}
                        </div>
                        <div
                          className="mb-2"
                          style={{ wordBreak: "break-word" }}
                        >
                          {msg.text || msg.message}
                        </div>
                        {(msg.timestamp || msg.createdAt) && (
                          <small
                            className={`d-block ${
                              msg.senderId === user._id
                                ? "text-white-50"
                                : "text-muted"
                            }`}
                          >
                            {new Date(
                              msg.timestamp || msg.createdAt
                            ).toLocaleTimeString()}
                          </small>
                        )}
                      </div>
                    </div>
                  </div>
                ))}

                {/* Typing indicator */}
                {isUserTyping(selectedUser._id) && (
                  <div className="mb-3">
                    <div className="d-flex justify-content-start">
                      <div
                        className="bg-white border rounded-3 p-3"
                        style={{ maxWidth: "70%" }}
                      >
                        <div className="fw-bold mb-1 small">
                          {selectedUser.name}
                        </div>
                        <div className="d-flex align-items-center">
                          <div
                            className="spinner-grow spinner-grow-sm text-muted me-2"
                            role="status"
                          ></div>
                          <div
                            className="spinner-grow spinner-grow-sm text-muted me-2"
                            role="status"
                          ></div>
                          <div
                            className="spinner-grow spinner-grow-sm text-muted"
                            role="status"
                          ></div>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                <div ref={messagesEndRef} />
              </>
            )}
          </div>
        </div>

        {/* Message Input */}
        <div className="card-footer bg-white">
          <div className="input-group">
            <textarea
              className="form-control"
              rows="1"
              value={message}
              onChange={handleMessageChange}
              onKeyDown={handleKeyPress}
              placeholder="Type your message... (Press Enter to send)"
              style={{ resize: "none" }}
            />
            <button
              className="btn btn-primary"
              type="button"
              onClick={sendMessage}
              disabled={!message.trim()}
            >
              <i className="bi bi-send-fill me-1"></i>
              Send
            </button>
          </div>
          <small className="text-muted d-block mt-1">
            Press Enter to send, Shift+Enter for new line
            {isTyping && (
              <span className="ms-2">
                <span className="badge bg-primary">
                  <i className="bi bi-pencil-fill me-1"></i>
                  You are typing...
                </span>
              </span>
            )}
          </small>
        </div>
      </div>
    </div>
  );
}
