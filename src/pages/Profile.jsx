import { useContext, useState } from "react";
import { AuthContext } from "../context/AuthContext";
import { MessageContext } from "../context/MessageContext";

export default function Profile() {
  const { user, logout } = useContext(AuthContext);
  const { unreadCount } = useContext(MessageContext);
  const [showDropdown, setShowDropdown] = useState(false);

  const handleLogout = () => {
    logout();
    setShowDropdown(false);
  };

  if (!user) {
    return null;
  }

  return (
    <div className="dropdown position-relative">
      <button
        className="btn btn-link dropdown-toggle d-flex align-items-center position-relative"
        type="button"
        onClick={() => setShowDropdown(!showDropdown)}
        style={{
          textDecoration: "none",
          border: "none",
          color: "white",
        }}
      >
        {/* Profile Icon */}
        <div
          className="rounded-circle bg-primary d-flex align-items-center justify-content-center me-2"
          style={{
            width: "35px",
            height: "35px",
            fontSize: "16px",
            fontWeight: "bold",
          }}
        >
          {user.name ? user.name.charAt(0).toUpperCase() : "U"}
        </div>

        {/* Unread Messages Badge */}
        {unreadCount > 0 && (
          <span
            className="position-absolute badge bg-danger rounded-circle"
            style={{
              top: "5px",
              right: "45px",
              fontSize: "10px",
              minWidth: "18px",
              height: "18px",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            {unreadCount > 99 ? "99+" : unreadCount}
          </span>
        )}

        <span className="d-none d-md-inline">{user.name}</span>
      </button>

      {/* Dropdown Menu */}
      {showDropdown && (
        <div
          className="dropdown-menu dropdown-menu-end show position-absolute"
          style={{ right: 0, top: "100%", zIndex: 1000 }}
        >
          <div className="dropdown-header">
            <strong>{user.name}</strong>
            <br />
            <small className="text-muted">{user.email}</small>
            {unreadCount > 0 && (
              <div className="mt-1">
                <small className="badge bg-primary">
                  {unreadCount} unread message
                  {unreadCount !== 1 ? "s" : ""}
                </small>
              </div>
            )}
          </div>
          <div className="dropdown-divider"></div>

          <a
            className="dropdown-item"
            href="#"
            onClick={(e) => e.preventDefault()}
          >
            <i className="fas fa-user me-2"></i>
            View Profile
          </a>

          <a
            className="dropdown-item"
            href="#"
            onClick={(e) => e.preventDefault()}
          >
            <i className="fas fa-cog me-2"></i>
            Settings
          </a>

          <div className="dropdown-divider"></div>

          <button className="dropdown-item text-danger" onClick={handleLogout}>
            <i className="fas fa-sign-out-alt me-2"></i>
            Logout
          </button>
        </div>
      )}

      {/* Overlay to close dropdown when clicking outside */}
      {showDropdown && (
        <div
          className="position-fixed top-0 start-0 w-100 h-100"
          style={{ zIndex: 999 }}
          onClick={() => setShowDropdown(false)}
        />
      )}
    </div>
  );
}
