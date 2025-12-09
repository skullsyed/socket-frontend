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
  const { socket } = useContext(SocketContext);
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

      // API expects userId as query parameter
      const response = await API.get("/api/messages/getUnreadCount", {
        params: {
          userId: user._id,
        },
      });

      console.log("Raw API response:", response.data);

      if (response.data) {
        // Extract unreadBySender from the response
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
      // Initialize with empty object on error
      setUnreadMessages({});
      setUnreadCount(0);
    }
  }, [user]);

  // Fetch unread counts on component mount and user change
  useEffect(() => {
    fetchUnreadCounts();
  }, [fetchUnreadCounts]);

  useEffect(() => {
    if (!socket || !user) return;

    console.log("Setting up socket listeners for user:", user._id);

    const handlePrivateMessage = (msg) => {
      console.log("MessageContext received message:", msg);
      console.log("Current user ID:", user._id);
      console.log("Message sender ID:", msg.senderId);

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
      setLastMessages((prev) => {
        const updated = {
          ...prev,
          [otherUserId]: {
            message: msg.message || msg.text,
            timestamp: msg.timestamp || new Date().toISOString(),
            senderId: msg.senderId,
          },
        };
        console.log("Updated lastMessages:", updated);
        return updated;
      });

      // Only count as unread if it's from another user
      if (msg.senderId !== user._id) {
        console.log("Adding unread message from:", msg.senderId);
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
    };

    const handleUserTyping = (data) => {
      console.log("User typing:", data);
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
      console.log("User stopped typing:", data);
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
      console.log("Cleaning up socket listeners");
      socket.off("private-message", handlePrivateMessage);
      socket.off("user-typing", handleUserTyping);
      socket.off("user-stopped-typing", handleUserStoppedTyping);
    };
  }, [socket, user]);

  // Mark messages as read using API
  const markAsRead = useCallback(
    async (senderId) => {
      if (!user || !senderId) return;

      try {
        console.log("Marking messages as read for sender:", senderId);

        // Call API to mark messages as read
        const response = await API.post("/api/messages/markAsRead", {
          senderId: senderId,
          receiverId: user._id,
        });

        console.log("Mark as read API response:", response.data);

        if (response.data) {
          console.log("Successfully marked messages as read via API");

          // Get the count that was marked as read
          const markedCount = unreadMessages[senderId] || 0;

          // Update local state
          setUnreadMessages((prev) => {
            const newUnread = { ...prev };
            delete newUnread[senderId];
            console.log("Updated unread after marking as read:", newUnread);
            return newUnread;
          });

          // Update total count
          setUnreadCount((prev) => Math.max(0, prev - markedCount));
        } else {
          console.error("API response indicates failure:", response.data);
        }
      } catch (error) {
        console.error("Error marking messages as read:", error);

        // Fallback: still update local state even if API fails
        const markedCount = unreadMessages[senderId] || 0;

        setUnreadMessages((prev) => {
          const newUnread = { ...prev };
          delete newUnread[senderId];
          console.log(
            "Updated unread after marking as read (fallback):",
            newUnread
          );
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
      console.log(
        `getUnreadCount for ${senderId}:`,
        count,
        "from state:",
        unreadMessages
      );
      return count;
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

  // Refresh unread counts manually (useful for testing or forced refresh)
  const refreshUnreadCounts = useCallback(() => {
    console.log("Manually refreshing unread counts...");
    fetchUnreadCounts();
  }, [fetchUnreadCounts]);

  // Test function to add unread messages manually (for debugging)
  const addTestUnreadMessage = useCallback((userId, count = 1) => {
    console.log(`Adding ${count} test unread messages for user:`, userId);
    setUnreadMessages((prev) => ({
      ...prev,
      [userId]: (prev[userId] || 0) + count,
    }));
    setUnreadCount((prev) => prev + count);
  }, []);

  // Debug: Log state changes
  useEffect(() => {
    console.log("=== MessageContext State Debug ===");
    console.log("- unreadMessages:", unreadMessages);
    console.log("- unreadCount:", unreadCount);
    console.log("- lastMessages:", lastMessages);
    console.log("- socket connected:", !!socket);
    console.log("- user:", user ? user._id : "null");
    console.log("================================");
  }, [unreadMessages, unreadCount, lastMessages, socket, user]);

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
        addTestUnreadMessage, // For debugging
      }}
    >
      {children}
    </MessageContext.Provider>
  );
};
