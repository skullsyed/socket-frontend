import {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
} from "react";
import { SocketContext } from "./SocketContext";
import { AuthContext } from "./AuthContext";

export const MessageContext = createContext();

export const MessageProvider = ({ children }) => {
  const { socket } = useContext(SocketContext);
  const { user } = useContext(AuthContext);
  const [unreadMessages, setUnreadMessages] = useState({});
  const [unreadCount, setUnreadCount] = useState(0);
  const [typingUsers, setTypingUsers] = useState({});
  const [lastMessages, setLastMessages] = useState({});

  useEffect(() => {
    if (!socket || !user) return;

    const handlePrivateMessage = (msg) => {
      // Update last message for this user
      setLastMessages((prev) => ({
        ...prev,
        [msg.senderId]: {
          message: msg.message || msg.text,
          timestamp: msg.timestamp || new Date().toISOString(),
        },
      }));

      // Only count as unread if it's from another user
      if (msg.senderId !== user._id) {
        setUnreadMessages((prev) => ({
          ...prev,
          [msg.senderId]: (prev[msg.senderId] || 0) + 1,
        }));
      }
    };

    const handleUserTyping = (data) => {
      if (data.userId !== user._id) {
        setTypingUsers((prev) => ({
          ...prev,
          [data.userId]: true,
        }));

        // Clear typing after 3 seconds
        setTimeout(() => {
          setTypingUsers((prev) => {
            const newState = { ...prev };
            delete newState[data.userId];
            return newState;
          });
        }, 3000);
      }
    };

    const handleUserStoppedTyping = (data) => {
      if (data.userId !== user._id) {
        setTypingUsers((prev) => {
          const newState = { ...prev };
          delete newState[data.userId];
          return newState;
        });
      }
    };

    socket.on("private-message", handlePrivateMessage);
    socket.on("user-typing", handleUserTyping);
    socket.on("user-stopped-typing", handleUserStoppedTyping);

    return () => {
      socket.off("private-message", handlePrivateMessage);
      socket.off("user-typing", handleUserTyping);
      socket.off("user-stopped-typing", handleUserStoppedTyping);
    };
  }, [socket, user]);

  // Calculate total unread count
  useEffect(() => {
    const total = Object.values(unreadMessages).reduce(
      (sum, count) => sum + count,
      0
    );
    setUnreadCount(total);
  }, [unreadMessages]);

  // Use useCallback to prevent function recreation on every render
  const markAsRead = useCallback((senderId) => {
    setUnreadMessages((prev) => {
      const newUnread = { ...prev };
      delete newUnread[senderId];
      return newUnread;
    });
  }, []);

  const getUnreadCount = useCallback(
    (senderId) => {
      return unreadMessages[senderId] || 0;
    },
    [unreadMessages]
  );

  const isUserTyping = useCallback(
    (userId) => {
      return typingUsers[userId] || false;
    },
    [typingUsers]
  );

  const emitTyping = useCallback(
    (receiverId) => {
      if (socket) {
        socket.emit("typing", { userId: user._id, receiverId });
      }
    },
    [socket, user]
  );

  const emitStoppedTyping = useCallback(
    (receiverId) => {
      if (socket) {
        socket.emit("stopped-typing", { userId: user._id, receiverId });
      }
    },
    [socket, user]
  );

  const getLastMessage = useCallback(
    (userId) => {
      return lastMessages[userId] || null;
    },
    [lastMessages]
  );

  return (
    <MessageContext.Provider
      value={{
        unreadMessages,
        unreadCount,
        markAsRead,
        getUnreadCount,
        isUserTyping,
        emitTyping,
        emitStoppedTyping,
        getLastMessage,
      }}
    >
      {children}
    </MessageContext.Provider>
  );
};
