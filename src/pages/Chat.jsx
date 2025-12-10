import { useContext, useEffect, useState, useRef, useCallback } from "react";
import { SocketContext } from "../context/SocketContext";
import { AuthContext } from "../context/AuthContext";
import { MessageContext } from "../context/MessageContext";
import API from "../api/axiosConfig";

export default function Chat({ selectedUser, onClose }) {
  const { socket } = useContext(SocketContext);
  const { user } = useContext(AuthContext);
  const messageContext = useContext(MessageContext);

  const {
    markAsRead = () => {},
    isUserTyping = () => false,
    emitTyping = () => {},
    emitStoppedTyping = () => {},
    getConversationMessages = () => [],
    addMessage = () => {},
  } = messageContext || {};

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

  // Remove duplicates and sort messages
  const removeDuplicatesAndSort = useCallback((messages) => {
    const uniqueMessages = messages.reduce((acc, current) => {
      const existingIndex = acc.findIndex(
        (msg) =>
          msg._id === current._id ||
          (msg.timestamp === current.timestamp &&
            msg.senderId === current.senderId &&
            msg.message === current.message &&
            msg.receiverId === current.receiverId)
      );

      if (existingIndex === -1) {
        acc.push(current);
      }
      return acc;
    }, []);

    // Sort by timestamp
    return uniqueMessages.sort((a, b) => {
      const timeA = new Date(a.timestamp || a.createdAt);
      const timeB = new Date(b.timestamp || b.createdAt);
      return timeA - timeB;
    });
  }, []);

  // Fetch messages from database
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

        console.log("Fetched messages from API:", res.data);
        const messages = res.data || [];

        // Remove duplicates and sort
        const cleanMessages = removeDuplicatesAndSort(messages);
        setChat(cleanMessages);

        setTimeout(scrollToBottom, 100);
      } catch (error) {
        console.error("Error fetching messages:", error);
        setChat([]);
      } finally {
        setLoading(false);
      }
    };

    fetchMessages();
  }, [
    selectedUser?._id,
    user?._id,
    markAsRead,
    scrollToBottom,
    removeDuplicatesAndSort,
  ]);

  // Listen for new socket messages
  useEffect(() => {
    if (!socket || !user) return;

    const handlePrivateMessage = (msg) => {
      console.log("Chat received socket message:", msg);

      // Only process if it's for this conversation
      if (
        selectedUser &&
        ((msg.senderId === user._id && msg.receiverId === selectedUser._id) ||
          (msg.senderId === selectedUser._id && msg.receiverId === user._id))
      ) {
        setChat((prevChat) => {
          // Add new message and remove duplicates
          const updatedChat = [...prevChat, msg];
          const cleanChat = removeDuplicatesAndSort(updatedChat);

          // Auto-scroll if new message was added
          setTimeout(scrollToBottom, 50);

          return cleanChat;
        });

        // Mark as read if it's from the selected user and chat is open
        if (msg.senderId === selectedUser._id && markAsRead) {
          markAsRead(selectedUser._id);
        }
      }
    };

    socket.on("private-message", handlePrivateMessage);
    return () => socket.off("private-message", handlePrivateMessage);
  }, [
    socket,
    user?._id,
    selectedUser?._id,
    markAsRead,
    scrollToBottom,
    removeDuplicatesAndSort,
  ]);

  useEffect(() => {
    if (selectedUser) {
      lastFetchedUser.current = null;
    }
  }, [selectedUser?._id]);

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
    if (!selectedUser || !message.trim() || !user || !socket) {
      console.log("Cannot send message:", {
        selectedUser: !!selectedUser,
        message: message.trim(),
        user: !!user,
        socket: !!socket,
      });
      return;
    }

    setIsTyping(false);
    emitStoppedTyping(selectedUser._id);
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }

    const tempId = `temp_${Date.now()}_${Math.random()}`;
    const msg = {
      _id: tempId,
      senderId: user._id,
      receiverId: selectedUser._id,
      message: message.trim(),
      timestamp: new Date().toISOString(),
    };

    // Clear input immediately for better UX
    const currentMessage = message;
    setMessage("");

    // Add temporary message to chat for immediate feedback
    setChat((prevChat) => {
      const updatedChat = [...prevChat, msg];
      return removeDuplicatesAndSort(updatedChat);
    });

    try {
      console.log("=== Sending Message ===");
      console.log("To database...");

      const response = await API.post("/api/messages/createMessage", {
        senderId: msg.senderId,
        receiverId: msg.receiverId,
        message: msg.message,
      });

      console.log("✓ Message saved to database:", response.data._id);

      // Replace temporary message with real message from database
      setChat((prevChat) => {
        const filteredChat = prevChat.filter((m) => m._id !== tempId);
        const updatedChat = [...filteredChat, response.data];
        return removeDuplicatesAndSort(updatedChat);
      });

      // CRITICAL: Emit to socket AFTER saving to database
      const socketMsg = {
        _id: response.data._id,
        senderId: response.data.senderId,
        receiverId: response.data.receiverId,
        message: response.data.message,
        text: response.data.message,
        timestamp: response.data.timestamp || new Date().toISOString(),
      };

      console.log("Emitting to socket:", socketMsg);
      socket.emit("private-message", socketMsg);
      console.log("✓ Message emitted via socket");
      console.log("=====================");
    } catch (error) {
      console.error("✗ Error saving message:", error);

      // Restore message in input if save failed
      setMessage(currentMessage);

      // Update temporary message to show error state
      setChat((prevChat) => {
        const updatedChat = prevChat.map((m) =>
          m._id === tempId
            ? { ...m, error: true, _id: `error_${Date.now()}` }
            : m
        );
        return updatedChat;
      });

      // Try to send via socket anyway as fallback
      const fallbackMsg = {
        ...msg,
        text: msg.message,
        _id: `fallback_${Date.now()}`,
      };

      socket.emit("private-message", fallbackMsg);
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
            <div className="d-flex align-items-center">
              {isUserTyping(selectedUser._id) && (
                <div className="d-flex align-items-center me-3">
                  <div
                    className="spinner-grow spinner-grow-sm text-light me-2"
                    role="status"
                  >
                    <span className="visually-hidden">Typing...</span>
                  </div>
                  <small className="text-white-50">typing...</small>
                </div>
              )}
              {/* Close Button */}
              {onClose && (
                <button
                  className="btn btn-outline-light btn-sm"
                  onClick={onClose}
                  title="Close Chat"
                >
                  <i className="bi bi-x-lg"></i>
                </button>
              )}
            </div>
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
                {/* Messages display with unique keys */}
                {chat.map((msg, idx) => {
                  // Create a truly unique key
                  const uniqueKey =
                    msg._id || `msg_${idx}_${msg.timestamp}_${msg.senderId}`;

                  return (
                    <div key={uniqueKey} className="mb-3">
                      <div
                        className={`d-flex ${
                          msg.senderId === user._id
                            ? "justify-content-end"
                            : "justify-content-start"
                        }`}
                      >
                        <div
                          className={`p-3 rounded-3 position-relative ${
                            msg.senderId === user._id
                              ? msg.error
                                ? "bg-danger text-white"
                                : "bg-primary text-white"
                              : "bg-white border"
                          }`}
                          style={{
                            maxWidth: "70%",
                            opacity: msg._id?.startsWith("temp_") ? 0.7 : 1,
                          }}
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

                          {/* Message status indicator */}
                          {msg.senderId === user._id && (
                            <small className="position-absolute bottom-0 end-0 me-1 mb-1">
                              {msg.error ? (
                                <i
                                  className="bi bi-exclamation-triangle text-warning"
                                  title="Failed to send"
                                ></i>
                              ) : msg._id?.startsWith("temp_") ? (
                                <i
                                  className="bi bi-clock text-warning"
                                  title="Sending..."
                                ></i>
                              ) : (
                                <i
                                  className="bi bi-check2-all text-success"
                                  title="Sent"
                                ></i>
                              )}
                            </small>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}

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
                            style={{ animationDelay: "0s" }}
                          ></div>
                          <div
                            className="spinner-grow spinner-grow-sm text-muted me-2"
                            role="status"
                            style={{ animationDelay: "0.15s" }}
                          ></div>
                          <div
                            className="spinner-grow spinner-grow-sm text-muted"
                            role="status"
                            style={{ animationDelay: "0.3s" }}
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
