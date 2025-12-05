import { useContext, useEffect, useState } from "react";
import { SocketContext } from "../context/SocketContext";
import { AuthContext } from "../context/AuthContext";

export default function Chat() {
  const { socket } = useContext(SocketContext);
  const { user } = useContext(AuthContext);

  const [message, setMessage] = useState("");
  const [chat, setChat] = useState([]);

  useEffect(() => {
    if (!socket) return;

    socket.on("receiveMessage", (msg) => {
      setChat((prev) => [...prev, msg]);
    });
  }, [socket]);

  const sendMessage = () => {
    socket.emit("sendMessage", {
      sender: user.name,
      text: message,
    });

    setChat([...chat, { sender: user.name, text: message }]);
    setMessage("");
  };

  return (
    <div className="container mt-4">
      <h2>Chat</h2>

      <div
        className="border p-3 mb-3"
        style={{ height: "300px", overflowY: "auto" }}
      >
        {chat.map((msg, idx) => (
          <p key={idx}>
            <strong>{msg.sender}:</strong> {msg.text}
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
