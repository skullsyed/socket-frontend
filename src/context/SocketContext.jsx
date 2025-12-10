import { createContext, useContext, useEffect, useState } from "react";
import { io } from "socket.io-client";
import { AuthContext } from "./AuthContext";

export const SocketContext = createContext();

export const SocketProvider = ({ children }) => {
  const { user } = useContext(AuthContext);
  const [socket, setSocket] = useState(null);
  const [isConnected, setIsConnected] = useState(false); // ADD THIS LINE

  useEffect(() => {
    if (!user || !user._id) {
      // Disconnect socket when user logs out
      if (socket) {
        console.log("User logged out, disconnecting socket");
        socket.disconnect();
        setSocket(null);
        setIsConnected(false);
      }
      return;
    }

    console.log("=== Initializing Socket Connection ===");
    console.log("User ID:", user._id);
    console.log("User Name:", user.name);

    const s = io("https://socket-backend-quck.onrender.com", {
      transports: ["websocket", "polling"],
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
    });

    s.on("connect", () => {
      console.log("✓ Socket connected successfully!");
      console.log("Socket ID:", s.id);
      console.log("Registering user with backend...");

      // Register user with backend
      s.emit("user-connected", user._id);
      setIsConnected(true);

      // Confirm registration after a short delay
      setTimeout(() => {
        console.log("Double-checking registration...");
        s.emit("user-connected", user._id);
      }, 500);
    });

    s.on("disconnect", (reason) => {
      console.log("✗ Socket disconnected. Reason:", reason);
      setIsConnected(false);
    });

    s.on("connect_error", (error) => {
      console.error("✗ Socket connection error:", error);
    });

    s.on("reconnect", (attemptNumber) => {
      console.log(`✓ Socket reconnected after ${attemptNumber} attempts`);
      // Re-register user after reconnection
      s.emit("user-connected", user._id);
      console.log("✓ User re-registered after reconnection");
      setIsConnected(true);
    });

    s.on("reconnect_attempt", (attemptNumber) => {
      console.log(`Attempting to reconnect... (${attemptNumber})`);
    });

    s.on("reconnect_failed", () => {
      console.error("✗ Failed to reconnect to socket server");
    });

    // Listen for online/offline users
    s.on("user-online", (userId) => {
      console.log("📢 User came online:", userId);
    });

    s.on("user-offline", (userId) => {
      console.log("📢 User went offline:", userId);
    });

    // Listen for registration confirmation
    s.on("registration-confirmed", (data) => {
      console.log("✓✓✓ REGISTRATION CONFIRMED BY SERVER ✓✓✓");
      console.log("Confirmed data:", data);
    });

    setSocket(s);

    return () => {
      console.log("Cleaning up socket connection for user:", user._id);
      if (s.connected) {
        s.disconnect();
      }
      setIsConnected(false);
    };
  }, [user?._id]);

  // Log connection status changes
  useEffect(() => {
    console.log(
      "Socket connection status:",
      isConnected ? "CONNECTED" : "DISCONNECTED"
    );
    if (isConnected && user) {
      console.log(`User ${user._id} (${user.name}) should be registered now`);
    }
  }, [isConnected, user]);

  return (
    <SocketContext.Provider value={{ socket, isConnected }}>
      {children}
    </SocketContext.Provider>
  );
};
