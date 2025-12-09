import { useContext, useEffect, useState } from "react";
import API from "../api/axiosConfig";
import { AuthContext } from "../context/AuthContext";
import { MessageContext } from "../context/MessageContext";

export default function UserList({ onUserSelect, selectedUser }) {
  const { user } = useContext(AuthContext);
  const { getUnreadCount, markAsRead } = useContext(MessageContext);
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

  const handleUserSelect = (selectedUser) => {
    // Mark messages as read when user is selected
    markAsRead(selectedUser._id);
    onUserSelect && onUserSelect(selectedUser);
  };

  if (loading) {
    return (
      <div className="text-center p-4">
        <div className="spinner-border" role="status">
          <span className="visually-hidden">Loading...</span>
        </div>
        <p className="mt-2 text-muted">Loading users...</p>
      </div>
    );
  }

  if (!Array.isArray(users) || users.length === 0) {
    return (
      <div className="text-center p-4">
        <i className="fas fa-users fa-2x text-muted mb-3"></i>
        <p className="text-muted">No other users available</p>
      </div>
    );
  }

  return (
    <div className="list-group list-group-flush">
      {users.map((u) => {
        const unreadCount = getUnreadCount(u._id);
        const isSelected = selectedUser?._id === u._id;

        return (
          <button
            key={u._id}
            type="button"
            className={`list-group-item list-group-item-action d-flex justify-content-between align-items-center ${
              isSelected ? "active" : ""
            }`}
            onClick={() => handleUserSelect(u)}
          >
            <div className="d-flex align-items-center">
              {/* User Avatar */}
              <div
                className={`rounded-circle d-flex align-items-center justify-content-center me-3 ${
                  isSelected ? "bg-white text-primary" : "bg-primary text-white"
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

              <div>
                <div className="fw-semibold">{u.name}</div>
                <small className={isSelected ? "text-white-50" : "text-muted"}>
                  {u.email}
                </small>
              </div>
            </div>

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
          </button>
        );
      })}
    </div>
  );
}
