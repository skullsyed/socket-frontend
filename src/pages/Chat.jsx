import { useContext, useEffect, useState } from "react";
import { SocketContext } from "../context/SocketContext";
import { AuthContext } from "../context/AuthContext";
import axios from "axios";

export default function Chat() {
  const { socket } = useContext(SocketContext);
  const { user } = useContext(AuthContext);

  const [message, setMessage] = useState("");
  const [chat, setChat] = useState([]);

  const handleRegister = async (e) => {
    e.preventDefault();

    await API.post("/api/messages/createMessage", {
      message,
    });
    navigate("/login");
  };

  useEffect(() => {
    const fetchMessages = async () => {
      const res = await axios.get("/api/messages/getAllMessage");
      const data = await res.data;
      setChat(data); // Set old messages
    };

    fetchMessages();
  }, []);

  // Listen for new socket messages
  useEffect(() => {
    if (!socket) return;

    socket.on("private-message", (msg) => {
      // Only show if sender or receiver matches the selected user
      if (msg.senderId === user._id || msg.senderId === selectedUser?._id) {
        setChat((prev) => [...prev, msg]);
      }
    });

    return () => socket.off("private-message");
  }, [socket, user, selectedUser]);

  const sendMessage = () => {
    if (!selectedUser) return;
    const msg = {
      senderId: user._id,
      receiverId: selectedUser._id,
      text: message,
    };

    socket.emit("private-message", msg);
    setChat((prev) => [...prev, msg]);

    setMessage("");
  };

  if (!selectedUser) {
    return <h4>Select a user to start chatting</h4>;
  }

  return (
    <div className="container mt-4">
      <h2>Chat with {selectedUser.name}</h2>

      <div
        className="border p-3 mb-3"
        style={{ height: "300px", overflowY: "auto" }}
      >
        {chat.map((msg, idx) => (
          <p key={idx}>
            <strong>
              {msg.senderId === user._id ? "You" : selectedUser.name}:
            </strong>{" "}
            {msg.text}
          </p>
        ))}
      </div>

      <div className="d-flex">
        <input
          className="form-control"
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          placeholder="Type message..."
        />
        <button className="btn btn-primary ms-2" onClick={sendMessage}>
          Send
        </button>
      </div>
    </div>
  );
}
