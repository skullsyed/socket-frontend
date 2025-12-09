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
  const [allMessages, setAllMessages] = useState([]); // Store all messages for real-time updates

  useEffect(() => {
    if (!socket || !user) return;

    const handlePrivateMessage = (msg) => {
      console.log("MessageContext received message:", msg);

      // Add to all messages array for real-time updates
      setAllMessages((prev) => {
        const messageExists = prev.some(
          (existingMsg) => existingMsg._id === msg._id
        );
        if (!messageExists) {
          return [...prev, msg];
        }
        return prev;
      });

      // Update last message for sender/receiver
      const otherUserId =
        msg.senderId === user._id ? msg.receiverId : msg.senderId;
      setLastMessages((prev) => ({
        ...prev,
        [otherUserId]: {
          message: msg.message || msg.text,
          timestamp: msg.timestamp || new Date().toISOString(),
          senderId: msg.senderId,
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

  // Get messages for a specific conversation
  const getConversationMessages = useCallback(
    (userId1, userId2) => {
      return allMessages
        .filter(
          (msg) =>
            (msg.senderId === userId1 && msg.receiverId === userId2) ||
            (msg.senderId === userId2 && msg.receiverId === userId1)
        )
        .sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));
    },
    [allMessages]
  );

  // Update last messages when new message is added
  const addMessage = useCallback((message) => {
    setAllMessages((prev) => [...prev, message]);
  }, []);

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
        getConversationMessages,
        addMessage,
        allMessages,
      }}
    >
      {children}
    </MessageContext.Provider>
  );
};
