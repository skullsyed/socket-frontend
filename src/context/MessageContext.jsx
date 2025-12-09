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

  useEffect(() => {
    if (!socket || !user) return;

    const handlePrivateMessage = (msg) => {
      // Only count as unread if it's from another user
      if (msg.senderId !== user._id) {
        setUnreadMessages((prev) => ({
          ...prev,
          [msg.senderId]: (prev[msg.senderId] || 0) + 1,
        }));
      }
    };

    socket.on("private-message", handlePrivateMessage);

    return () => socket.off("private-message", handlePrivateMessage);
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
  return (
    <MessageContext.Provider
      value={{
        unreadMessages,
        unreadCount,
        markAsRead,
        getUnreadCount,
      }}
    >
      {children}
    </MessageContext.Provider>
  );
};
