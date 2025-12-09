import { useContext, useEffect, useState, useRef } from "react";
import { SocketContext } from "../context/SocketContext";
import { AuthContext } from "../context/AuthContext";
import { MessageContext } from "../context/MessageContext";
import API from "../api/axiosConfig";

export default function Chat({ selectedUser }) {
  const { socket } = useContext(SocketContext);
  const { user } = useContext(AuthContext);
  const { markAsRead } = useContext(MessageContext);

  const [message, setMessage] = useState("");
  const [chat, setChat] = useState([]);
  const [loading, setLoading] = useState(false);

  // Use ref to track if we've already fetched messages for this user
  const lastFetchedUser = useRef(null);

  useEffect(() => {
    const fetchMessages = async () => {
      if (!selectedUser || !user) return;

      // Prevent refetching for the same user
      if (lastFetchedUser.current === selectedUser._id) return;

      lastFetchedUser.current = selectedUser._id;

      // Mark messages as read when opening chat
      markAsRead(selectedUser._id);

      setLoading(true);
      try {
        // Use query parameters as your backend expects
        const res = await API.get("/api/messages/getAllMessage", {
          params: {
            senderId: user._id,
            receiverId: selectedUser._id,
          },
        });

        console.log("Fetched messages:", res.data);
        setChat(res.data || []);
      } catch (error) {
        console.error("Error fetching messages:", error);
        setChat([]);
      } finally {
        setLoading(false);
      }
    };

    fetchMessages();
  }, [selectedUser?._id, user?._id]); // Only depend on IDs, not the full objects

  // Separate effect for marking as read when chat opens
  useEffect(() => {
    if (selectedUser && markAsRead) {
      markAsRead(selectedUser._id);
    }
  }, [selectedUser?._id, markAsRead]);

  // Listen for new socket messages
  useEffect(() => {
    if (!socket || !user) return;

    const handlePrivateMessage = (msg) => {
      console.log("Received socket message:", msg);

      // Only add message if it's between current user and selected user
      if (
        selectedUser &&
        ((msg.senderId === user._id && msg.receiverId === selectedUser._id) ||
          (msg.senderId === selectedUser._id && msg.receiverId === user._id))
      ) {
        setChat((prev) => {
          // Prevent duplicate messages
          const messageExists = prev.some(
            (existingMsg) =>
              existingMsg._id === msg._id ||
              (existingMsg.timestamp === msg.timestamp &&
                existingMsg.senderId === msg.senderId &&
                existingMsg.message === msg.message)
          );

          if (messageExists) return prev;

          return [...prev, msg];
        });

        // Mark as read if it's from the selected user and chat is open
        if (msg.senderId === selectedUser._id && markAsRead) {
          markAsRead(selectedUser._id);
        }
      }
    };

    socket.on("private-message", handlePrivateMessage);

    return () => socket.off("private-message", handlePrivateMessage);
  }, [socket, user?._id, selectedUser?._id, markAsRead]);

  // Reset lastFetchedUser when selectedUser changes
  useEffect(() => {
    if (selectedUser) {
      lastFetchedUser.current = null; // Reset to allow fetching for new user
    }
  }, [selectedUser?._id]);

  const sendMessage = async () => {
    if (!selectedUser || !message.trim() || !user) return;

    const msg = {
      senderId: user._id,
      receiverId: selectedUser._id,
      message: message.trim(),
      timestamp: new Date().toISOString(),
    };

    try {
      console.log("Sending message to database:", msg);

      // Save message to database first
      const response = await API.post("/api/messages/createMessage", {
        senderId: msg.senderId,
        receiverId: msg.receiverId,
        message: msg.message,
      });

      console.log("Database response:", response.data);

      // Create message object for socket and UI
      const socketMsg = {
        ...response.data, // Use the complete response from database
        text: response.data.message, // Add text field for socket compatibility
      };

      // Then emit via socket for real-time delivery
      socket.emit("private-message", socketMsg);

      // Add to local state for immediate UI update (avoid duplicates)
      setChat((prev) => {
        const messageExists = prev.some((msg) => msg._id === response.data._id);
        if (messageExists) return prev;
        return [...prev, response.data];
      });

      setMessage("");
    } catch (error) {
      console.error("Error saving message to database:", error);
      console.error("Error details:", error.response?.data);

      // Still emit via socket and update UI even if database save fails
      const fallbackMsg = {
        ...msg,
        text: msg.message,
        _id: `temp_${Date.now()}`, // Temporary ID with prefix
      };

      socket.emit("private-message", fallbackMsg);
      setChat((prev) => [...prev, fallbackMsg]);
      setMessage("");

      alert(
        "Message sent but may not be saved to database. Check console for details."
      );
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
      <div className="container mt-4 text-center">
        <div className="alert alert-info">
          <i className="fas fa-users fa-2x mb-3"></i>
          <h4>Select a user to start chatting</h4>
          <p className="mb-0">
            Choose a user from the list to begin your conversation.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="container mt-4">
      <div className="card">
        <div className="card-header bg-primary text-white">
          <h5 className="mb-0">
            <i className="fas fa-comment me-2"></i>
            Chat with {selectedUser.name}
          </h5>
        </div>

        <div className="card-body p-0">
          {/* Messages Area */}
          <div
            className="p-3"
            style={{
              height: "400px",
              overflowY: "auto",
              backgroundColor: "#f8f9fa",
            }}
          >
            {loading ? (
              <div className="text-center">
                <div className="spinner-border" role="status">
                  <span className="visually-hidden">Loading messages...</span>
                </div>
                <p className="mt-2 text-muted">Loading messages...</p>
              </div>
            ) : chat.length === 0 ? (
              <div className="text-center text-muted">
                <i className="fas fa-comments fa-3x mb-3 opacity-50"></i>
                <p>No messages yet. Start the conversation!</p>
              </div>
            ) : (
              chat.map((msg, idx) => (
                <div
                  key={msg._id || `msg_${idx}`}
                  className={`mb-3 d-flex ${
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
                    style={{
                      maxWidth: "70%",
                      wordWrap: "break-word",
                    }}
                  >
                    <div className="fw-bold mb-1">
                      {msg.senderId === user._id ? "You" : selectedUser.name}
                    </div>
                    <div className="mb-2">{msg.text || msg.message}</div>
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
              ))
            )}
          </div>

          {/* Message Input Area */}
          <div className="card-footer">
            <div className="input-group">
              <textarea
                className="form-control"
                rows="1"
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                onKeyDown={handleKeyPress}
                placeholder="Type your message... (Press Enter to send)"
                style={{ resize: "none" }}
              />
              <button
                className="btn btn-primary"
                onClick={sendMessage}
                disabled={!message.trim()}
              >
                <i className="fas fa-paper-plane me-1"></i>
                Send
              </button>
            </div>
            <small className="text-muted">
              Press Enter to send, Shift+Enter for new line
            </small>
          </div>
        </div>
      </div>
    </div>
  );
}
