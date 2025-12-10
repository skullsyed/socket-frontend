import {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
} from "react";
import { SocketContext } from "./SocketContext";
import { AuthContext } from "./AuthContext";
import API from "../api/axiosConfig";

export const MessageContext = createContext();

export const MessageProvider = ({ children }) => {
  const { socket, isConnected } = useContext(SocketContext);
  const { user } = useContext(AuthContext);
  const [unreadMessages, setUnreadMessages] = useState({});
  const [unreadCount, setUnreadCount] = useState(0);
  const [typingUsers, setTypingUsers] = useState({});
  const [lastMessages, setLastMessages] = useState({});
  const [allMessages, setAllMessages] = useState([]);

  // Fetch unread messages count from API when user is available
  const fetchUnreadCounts = useCallback(async () => {
    if (!user) return;

    try {
      console.log("Fetching unread counts from API for user:", user._id);

      const response = await API.get("/api/messages/getUnreadCount", {
        params: {
          userId: user._id,
        },
      });

      console.log("Raw API response:", response.data);

      if (response.data) {
        const unreadBySender = response.data.unreadBySender || {};
        const totalUnread = response.data.totalUnread || 0;

        console.log("Extracted unread data:", {
          unreadBySender,
          totalUnread,
        });

        setUnreadMessages(unreadBySender);
        setUnreadCount(totalUnread);
      } else {
        console.log(
          "No unread data in response, initializing with empty state"
        );
        setUnreadMessages({});
        setUnreadCount(0);
      }
    } catch (error) {
      console.error("Error fetching unread counts:", error);
      setUnreadMessages({});
      setUnreadCount(0);
    }
  }, [user]);

  // Fetch unread counts on component mount and user change
  useEffect(() => {
    fetchUnreadCounts();
  }, [fetchUnreadCounts]);

  // Setup socket listeners - CRITICAL FIX
  useEffect(() => {
    if (!socket || !user || !isConnected) {
      console.log("⚠️ Socket not ready for listeners:", {
        socket: !!socket,
        user: !!user,
        isConnected,
      });
      return;
    }

    console.log("✓✓✓ Setting up socket listeners for user:", user._id);
    console.log("Socket ID:", socket.id);

    const handlePrivateMessage = (msg) => {
      console.log("\n=== MessageContext Received Message ===");
      console.log("Message:", msg);
      console.log("Current user ID:", user._id);
      console.log("Message sender ID:", msg.senderId);
      console.log("Message receiver ID:", msg.receiverId);

      // Verify this message is for the current conversation
      const isForCurrentUser =
        msg.receiverId === user._id || msg.senderId === user._id;
      console.log("Is for current user:", isForCurrentUser);

      if (!isForCurrentUser) {
        console.log("✗ Message not for current user, ignoring");
        return;
      }

      // Add to all messages array for real-time updates
      setAllMessages((prev) => {
        const messageExists = prev.some(
          (existingMsg) => existingMsg._id === msg._id
        );
        if (messageExists) {
          console.log("Message already exists, skipping");
          return prev;
        }
        console.log("✓ Adding message to allMessages");
        return [...prev, msg];
      });

      // Update last message for sender/receiver
      const otherUserId =
        msg.senderId === user._id ? msg.receiverId : msg.senderId;
      setLastMessages((prev) => {
        const updated = {
          ...prev,
          [otherUserId]: {
            message: msg.message || msg.text,
            timestamp: msg.timestamp || new Date().toISOString(),
            senderId: msg.senderId,
          },
        };
        console.log("✓ Updated lastMessages for user:", otherUserId);
        return updated;
      });

      // Only count as unread if it's from another user
      if (msg.senderId !== user._id) {
        console.log("✓ Message from another user, incrementing unread count");
        setUnreadMessages((prev) => {
          const updated = {
            ...prev,
            [msg.senderId]: (prev[msg.senderId] || 0) + 1,
          };
          console.log("Updated unreadMessages:", updated);
          return updated;
        });

        // Update total count
        setUnreadCount((prev) => prev + 1);
      } else {
        console.log("Message from current user, not counting as unread");
      }
      console.log("=====================================\n");
    };

    const handleUserTyping = (data) => {
      console.log("\n=== User Typing Event Received ===");
      console.log("Full data:", data);
      console.log("Typing user ID:", data.userId);
      console.log("Current user ID:", user._id);

      if (data.userId && data.userId !== user._id) {
        console.log("✓ Setting typing state for user:", data.userId);
        setTypingUsers((prev) => {
          const updated = {
            ...prev,
            [data.userId]: true,
          };
          console.log("Updated typing users:", updated);
          return updated;
        });

        // Clear typing after 3 seconds as fallback
        setTimeout(() => {
          setTypingUsers((prev) => {
            const newState = { ...prev };
            delete newState[data.userId];
            console.log("Auto-cleared typing for:", data.userId);
            return newState;
          });
        }, 3000);
      } else {
        console.log("Ignoring typing event (same user or invalid data)");
      }
      console.log("===================================\n");
    };

    const handleUserStoppedTyping = (data) => {
      console.log("\n=== User Stopped Typing Event Received ===");
      console.log("Full data:", data);
      console.log("User ID:", data.userId);

      if (data.userId && data.userId !== user._id) {
        console.log("✓ Removing typing state for user:", data.userId);
        setTypingUsers((prev) => {
          const newState = { ...prev };
          delete newState[data.userId];
          console.log("Updated typing users:", newState);
          return newState;
        });
      }
      console.log("==========================================\n");
    };

    // Register event listeners
    console.log("Registering event: private-message");
    socket.on("private-message", handlePrivateMessage);

    console.log("Registering event: user-typing");
    socket.on("user-typing", handleUserTyping);

    console.log("Registering event: user-stopped-typing");
    socket.on("user-stopped-typing", handleUserStoppedTyping);

    console.log("✓✓✓ All socket listeners registered successfully!\n");

    // Cleanup function
    return () => {
      console.log("🧹 Cleaning up socket listeners for user:", user._id);
      socket.off("private-message", handlePrivateMessage);
      socket.off("user-typing", handleUserTyping);
      socket.off("user-stopped-typing", handleUserStoppedTyping);
    };
  }, [socket, user, isConnected]); // Add isConnected to dependencies

  // Mark messages as read using API
  const markAsRead = useCallback(
    async (senderId) => {
      if (!user || !senderId) return;

      try {
        console.log("Marking messages as read for sender:", senderId);

        const response = await API.post("/api/messages/markAsRead", {
          senderId: senderId,
          receiverId: user._id,
        });

        console.log("Mark as read API response:", response.data);

        if (response.data) {
          console.log("Successfully marked messages as read via API");

          const markedCount = unreadMessages[senderId] || 0;

          setUnreadMessages((prev) => {
            const newUnread = { ...prev };
            delete newUnread[senderId];
            console.log("Updated unread after marking as read:", newUnread);
            return newUnread;
          });

          setUnreadCount((prev) => Math.max(0, prev - markedCount));
        }
      } catch (error) {
        console.error("Error marking messages as read:", error);

        const markedCount = unreadMessages[senderId] || 0;

        setUnreadMessages((prev) => {
          const newUnread = { ...prev };
          delete newUnread[senderId];
          return newUnread;
        });

        setUnreadCount((prev) => Math.max(0, prev - markedCount));
      }
    },
    [user, unreadMessages]
  );

  const getUnreadCount = useCallback(
    (senderId) => {
      const count = unreadMessages[senderId] || 0;
      return count;
    },
    [unreadMessages]
  );

  const isUserTyping = useCallback(
    (userId) => {
      const typing = typingUsers[userId] || false;
      // Removed excessive logging
      return typing;
    },
    [typingUsers]
  );

  const emitTyping = useCallback(
    (receiverId) => {
      if (socket && user) {
        console.log("Emitting typing event to:", receiverId);
        socket.emit("typing", { userId: user._id, receiverId });
      }
    },
    [socket, user]
  );

  const emitStoppedTyping = useCallback(
    (receiverId) => {
      if (socket && user) {
        console.log("Emitting stopped-typing event to:", receiverId);
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

  const addMessage = useCallback((message) => {
    setAllMessages((prev) => [...prev, message]);
  }, []);

  const refreshUnreadCounts = useCallback(() => {
    console.log("Manually refreshing unread counts...");
    fetchUnreadCounts();
  }, [fetchUnreadCounts]);

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
        refreshUnreadCounts,
      }}
    >
      {children}
    </MessageContext.Provider>
  );
};
