import { useContext, useEffect, useState } from "react";
import { SocketContext } from "../context/SocketContext";
import { AuthContext } from "../context/AuthContext";
import axios from "axios";
import API from "../api/axiosConfig";

export default function Chat({ selectedUser }) {
  const { socket } = useContext(SocketContext);
  const { user } = useContext(AuthContext);

  const [message, setMessage] = useState("");
  const [chat, setChat] = useState([]);

  useEffect(() => {
    const fetchMessages = async () => {
      if (!selectedUser || !user) return;
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
      }
    };

    fetchMessages();
  }, [selectedUser, user]);

  // Listen for new socket messages
  useEffect(() => {
    if (!socket || !user) return;

    const handlePrivateMessage = (msg) => {
      // Only add message if it's between current user and selected user
      console.log("Received socket message:", msg);
      if (
        selectedUser &&
        ((msg.senderId === user._id && msg.receiverId === selectedUser._id) ||
          (msg.senderId === selectedUser._id && msg.receiverId === user._id))
      ) {
        setChat((prev) => [...prev, msg]);
      }
    };

    socket.on("private-message", handlePrivateMessage);

    return () => socket.off("private-message", handlePrivateMessage);
  }, [socket, user, selectedUser]);

  const sendMessage = async () => {
    if (!selectedUser || !message.trim() || !user) return;

    const msg = {
      senderId: user._id,
      receiverId: selectedUser._id,
      message: message.trim(), // Use 'message' field to match your backend
      timestamp: new Date().toISOString(),
    };

    try {
      console.log("Sending message to database:", msg);
      // Save message to database first
      const response = await API.post("/api/messages/createMessage", {
        senderId: msg.senderId,
        receiverId: msg.receiverId,
        message: msg.message, // Note: using 'message' field as per your backend
      });

      console.log("Database response:", response.data);

      // Create message object for socket and UI (with 'text' for consistency)
      const socketMsg = {
        ...msg,
        text: msg.message, // Add text field for socket compatibility
        _id: response.data._id, // Add ID from database response
      };

      // Then emit via socket for real-time delivery
      socket.emit("private-message", socketMsg);

      // Add to local state for immediate UI update
      setChat((prev) => [...prev, response.data]); // Use the response from database

      setMessage("");
    } catch (error) {
      console.error("Error saving message to database:", error);
      console.error("Error details:", error.response?.data);

      // Still emit via socket and update UI even if database save fails
      socket.emit("private-message", {
        ...msg,
        text: msg.message,
      });
      setChat((prev) => [...prev, msg]);
      setMessage("");
      // Show user feedback about the error
      alert(
        "Message sent but may not be saved to database. Check console for details."
      );
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === "Enter") {
      sendMessage();
    }
  };

  if (!selectedUser) {
    return (
      <div className="container mt-4">
        <h4>Select a user to start chatting</h4>
      </div>
    );
  }

  return (
    <div className="container mt-4">
      <h2>Chat with {selectedUser.name}</h2>

      <div
        className="border p-3 mb-3"
        style={{ height: "300px", overflowY: "auto" }}
      >
        {chat.length === 0 ? (
          <p className="text-muted">No messages yet. Start the conversation!</p>
        ) : (
          chat.map((msg, idx) => (
            <div
              key={idx}
              className={`mb-2 ${
                msg.senderId === user._id ? "text-end" : "text-start"
              }`}
            >
              <div
                className={`d-inline-block p-2 rounded ${
                  msg.senderId === user._id
                    ? "bg-primary text-white"
                    : "bg-light text-dark"
                }`}
                style={{ maxWidth: "70%" }}
              >
                <strong>
                  {msg.senderId === user._id ? "You" : selectedUser.name}:
                </strong>{" "}
                {msg.text || msg.message}
                {msg.timestamp && (
                  <small className="d-block mt-1 opacity-75">
                    {new Date(msg.timestamp).toLocaleTimeString()}
                  </small>
                )}
              </div>
            </div>
          ))
        )}
      </div>

      <div className="d-flex">
        <input
          className="form-control"
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          onKeyDown={handleKeyPress}
          placeholder="Type message..."
        />
        <button
          className="btn btn-primary ms-2"
          onClick={sendMessage}
          disabled={!message.trim()}
        >
          Send
        </button>
      </div>
    </div>
  );
}
