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
  } = messageContext || {};

  const [loading, setLoading] = useState(true);
  const [users, setUsers] = useState([]);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const { data } = await API.get("/api/auth/getAllUser", {
          headers: {
            "Cache-Control": "no-cache",
            Pragma: "no-cache",
            Expires: "0",
          },
        });

        const filteredUsers = data.data
          ? data.data.filter((u) => u._id !== user?._id)
          : [];

        setUsers(filteredUsers);
      } catch (error) {
        console.error("Error fetching users:", error);
      }
      setLoading(false);
    };

    fetchData();
  }, [user]);

  const sortedUsers = useMemo(() => {
    if (!Array.isArray(users)) return [];

    return [...users].sort((a, b) => {
      const lastMsgA = getLastMessage(a._id);
      const lastMsgB = getLastMessage(b._id);

      if (lastMsgA && lastMsgB) {
        return new Date(lastMsgB.timestamp) - new Date(lastMsgA.timestamp);
      }

      if (lastMsgA && !lastMsgB) return -1;
      if (!lastMsgA && lastMsgB) return 1;

      return a.name.localeCompare(b.name);
    });
  }, [users, getLastMessage]);

  const handleUserSelect = (selectedUser) => {
    markAsRead(selectedUser._id);
    onUserSelect && onUserSelect(selectedUser);
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

  if (!Array.isArray(sortedUsers) || sortedUsers.length === 0) {
    return (
      <div className="d-flex justify-content-center align-items-center p-4">
        <div className="text-center text-muted">
          <i className="bi bi-people display-4 opacity-50"></i>
          <p className="mt-2">No other users available</p>
        </div>
      </div>
    );
  }

  return (
    <div className="list-group list-group-flush">
      {sortedUsers.map((u) => {
        const unreadCount = getUnreadCount(u._id);
        const isSelected = selectedUser?._id === u._id;
        const lastMessage = getLastMessage(u._id);

        return (
          <button
            key={u._id}
            type="button"
            className={`list-group-item list-group-item-action d-flex align-items-start p-3 ${
              isSelected ? "active" : ""
            }`}
            onClick={() => handleUserSelect(u)}
          >
            <div className="d-flex align-items-start w-100">
              {/* Avatar */}
              <div className="me-3 flex-shrink-0">
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
                    }`}
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
                    }`}
                    style={{ maxWidth: "200px" }}
                  >
                    {lastMessage ? lastMessage.message : u.email}
                  </small>

                  {/* Unread Badge */}
                  {unreadCount > 0 && (
                    <span
                      className={`badge rounded-pill ${
                        isSelected ? "bg-warning text-dark" : "bg-danger"
                      }`}
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
