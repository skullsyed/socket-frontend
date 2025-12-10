import { useContext, useEffect, useState, useMemo } from "react";
import API from "../api/axiosConfig";
import { AuthContext } from "../context/AuthContext";
import { MessageContext } from "../context/MessageContext";

export default function UserList({ onUserSelect, selectedUser }) {
  const { user } = useContext(AuthContext);
  const messageContext = useContext(MessageContext);

  // Destructure with fallback functions to prevent errors
  const {
    getUnreadCount = () => 0,
    markAsRead = () => {},
    getLastMessage = () => null,
    unreadMessages = {},
    refreshUnreadCounts = () => {},
  } = messageContext || {};

  const [loading, setLoading] = useState(true);
  const [users, setUsers] = useState([]);
  const [refreshKey, setRefreshKey] = useState(0);
  const [error, setError] = useState(null);
  // Force refresh when unreadMessages change
  useEffect(() => {
    setRefreshKey((prev) => prev + 1);
    console.log("UserList: unreadMessages updated:", unreadMessages);
  }, [unreadMessages]);

  useEffect(() => {
    const fetchData = async () => {
      if (!user || !user._id) {
        console.log("UserList: No user available yet");
        setLoading(false);
        return;
      }

      setLoading(true);
      setError(null);

      try {
        console.log("UserList: Fetching users from API...");
        console.log("UserList: Current user ID:", user._id);
        console.log("UserList: API Base URL:", import.meta.env.VITE_API_URL);

        const response = await API.get("/api/auth/getAllUser", {
          headers: {
            "Cache-Control": "no-cache",
            Pragma: "no-cache",
            Expires: "0",
          },
        });

        console.log("UserList: Raw API response:", response);
        console.log("UserList: Response data:", response.data);

        // Handle different response formats
        let allUsers = [];

        if (Array.isArray(response.data)) {
          console.log("UserList: Data is array format");
          allUsers = response.data;
        } else if (response.data.data && Array.isArray(response.data.data)) {
          console.log("UserList: Data is nested in 'data' property");
          allUsers = response.data.data;
        } else if (response.data.users && Array.isArray(response.data.users)) {
          console.log("UserList: Data is nested in 'users' property");
          allUsers = response.data.users;
        } else {
          console.warn("UserList: Unexpected response format:", response.data);
          setError("Unexpected data format from server");
          setLoading(false);
          return;
        }

        console.log("UserList: All users from API:", allUsers);
        console.log("UserList: Total users count:", allUsers.length);

        // Filter out current user
        const filteredUsers = allUsers.filter((u) => {
          const isCurrentUser = u._id === user._id;
          console.log(
            `UserList: User ${u.name} (${u._id}) - Is current user: ${isCurrentUser}`
          );
          return !isCurrentUser;
        });

        console.log("UserList: Filtered users:", filteredUsers);
        console.log("UserList: Filtered users count:", filteredUsers.length);

        setUsers(filteredUsers);
        setError(null);
      } catch (error) {
        console.error("UserList: Error fetching users:", error);
        console.error("UserList: Error message:", error.message);
        console.error("UserList: Error response:", error.response?.data);
        console.error("UserList: Error status:", error.response?.status);

        setError(
          error.response?.data?.message ||
            error.message ||
            "Failed to load users"
        );
        setUsers([]);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [user?._id]);

  const sortedUsers = useMemo(() => {
    console.log("UserList: Sorting users...");
    console.log("UserList: Input users:", users);

    if (!Array.isArray(users)) {
      console.log("UserList: users is not an array, returning empty");
      return [];
    }

    if (users.length === 0) {
      console.log("UserList: users array is empty");
      return [];
    }

    const sorted = [...users].sort((a, b) => {
      const unreadA = getUnreadCount(a._id);
      const unreadB = getUnreadCount(b._id);

      if (unreadA > 0 && unreadB === 0) return -1;
      if (unreadA === 0 && unreadB > 0) return 1;

      const lastMsgA = getLastMessage(a._id);
      const lastMsgB = getLastMessage(b._id);

      if (lastMsgA && lastMsgB) {
        return new Date(lastMsgB.timestamp) - new Date(lastMsgA.timestamp);
      }

      if (lastMsgA && !lastMsgB) return -1;
      if (!lastMsgA && lastMsgB) return 1;

      return a.name.localeCompare(b.name);
    });

    console.log("UserList: Sorted users:", sorted);
    return sorted;
  }, [users, getLastMessage, getUnreadCount, refreshKey]);

  const handleUserSelect = (selectedUser) => {
    console.log("UserList: User selected:", selectedUser);
    markAsRead(selectedUser._id);
    onUserSelect && onUserSelect(selectedUser);
  };

  const handleRefresh = () => {
    console.log("UserList: Manual refresh triggered");
    window.location.reload();
  };

  if (loading) {
    return (
      <div className="d-flex justify-content-center align-items-center p-4">
        <div className="text-center">
          <div className="spinner-border text-primary" role="status">
            <span className="visually-hidden">Loading...</span>
          </div>
          <p className="mt-2 text-muted">Loading users...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="d-flex justify-content-center align-items-center p-4">
        <div className="text-center text-danger">
          <i className="bi bi-exclamation-triangle display-4 mb-3"></i>
          <p className="mt-2">Error: {error}</p>
          <button
            className="btn btn-outline-primary btn-sm mt-2"
            onClick={handleRefresh}
          >
            <i className="bi bi-arrow-clockwise me-1"></i>
            Retry
          </button>
        </div>
      </div>
    );
  }

  if (!Array.isArray(sortedUsers) || sortedUsers.length === 0) {
    console.log("UserList: No users to display");
    console.log("UserList: sortedUsers:", sortedUsers);
    console.log("UserList: Is array:", Array.isArray(sortedUsers));
    console.log("UserList: Length:", sortedUsers?.length);

    return (
      <div className="d-flex justify-content-center align-items-center p-4">
        <div className="text-center text-muted">
          <i className="bi bi-people display-4 opacity-50"></i>
          <p className="mt-2">No other users available</p>
          <button
            className="btn btn-outline-primary btn-sm mt-2"
            onClick={handleRefresh}
          >
            <i className="bi bi-arrow-clockwise me-1"></i>
            Refresh
          </button>
        </div>
      </div>
    );
  }

  console.log("UserList: Rendering with users:", sortedUsers.length);
  console.log("UserList: Current unreadMessages:", unreadMessages);

  return (
    <div className="list-group list-group-flush">
      {sortedUsers.map((u) => {
        const unreadCount = getUnreadCount(u._id);
        const isSelected = selectedUser?._id === u._id;
        const lastMessage = getLastMessage(u._id);

        console.log(
          `UserList: User ${u.name} (${u._id}), unreadCount:`,
          unreadCount
        );

        return (
          <button
            key={`${u._id}-${refreshKey}`}
            type="button"
            className={`list-group-item list-group-item-action d-flex align-items-start p-3 position-relative ${
              isSelected ? "active" : ""
            } ${unreadCount > 0 ? "border-start border-primary border-3" : ""}`}
            onClick={() => handleUserSelect(u)}
          >
            <div className="d-flex align-items-start w-100">
              {/* Avatar */}
              <div className="me-3 flex-shrink-0 position-relative">
                <div
                  className={`rounded-circle d-flex align-items-center justify-content-center ${
                    isSelected
                      ? "bg-white text-primary"
                      : "bg-primary text-white"
                  }`}
                  style={{
                    width: "40px",
                    height: "40px",
                    fontSize: "16px",
                    fontWeight: "bold",
                  }}
                >
                  {u.name ? u.name.charAt(0).toUpperCase() : "U"}
                </div>
              </div>

              {/* User Info */}
              <div className="flex-grow-1 min-w-0">
                <div className="d-flex justify-content-between align-items-center mb-1">
                  <h6
                    className={`mb-0 text-truncate ${
                      isSelected ? "text-white" : "text-dark"
                    } ${unreadCount > 0 ? "fw-bold" : ""}`}
                  >
                    {u.name}
                  </h6>
                  {lastMessage && (
                    <small
                      className={isSelected ? "text-white-50" : "text-muted"}
                    >
                      {new Date(lastMessage.timestamp).toLocaleDateString() ===
                      new Date().toLocaleDateString()
                        ? new Date(lastMessage.timestamp).toLocaleTimeString(
                            [],
                            {
                              hour: "2-digit",
                              minute: "2-digit",
                            }
                          )
                        : new Date(lastMessage.timestamp).toLocaleDateString()}
                    </small>
                  )}
                </div>

                <div className="d-flex justify-content-between align-items-center">
                  <small
                    className={`text-truncate me-2 ${
                      isSelected ? "text-white-50" : "text-muted"
                    } ${unreadCount > 0 ? "fw-semibold" : ""}`}
                    style={{ maxWidth: "180px" }}
                  >
                    {lastMessage ? lastMessage.message : u.email}
                  </small>

                  {/* Main unread badge */}
                  {unreadCount > 0 && (
                    <span
                      className={`badge rounded-pill ${
                        isSelected ? "bg-warning text-dark" : "bg-danger"
                      }`}
                      style={{ minWidth: "20px", fontSize: "11px" }}
                    >
                      {unreadCount > 99 ? "99+" : unreadCount}
                    </span>
                  )}
                </div>
              </div>
            </div>
          </button>
        );
      })}
    </div>
  );
}
