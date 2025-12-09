import { useContext, useState } from "react";
import { AuthContext } from "../context/AuthContext";
import { MessageContext } from "../context/MessageContext";

export default function Profile() {
  const { user, logout } = useContext(AuthContext);
  const messageContext = useContext(MessageContext);
  const { unreadCount = 0 } = messageContext || {};
  const [showDropdown, setShowDropdown] = useState(false);

  const handleLogout = () => {
    logout();
    setShowDropdown(false);
  };

  if (!user) {
    return null;
  }

  return (
    <div className="dropdown">
      <button
        className="btn btn-link text-white dropdown-toggle d-flex align-items-center text-decoration-none"
        type="button"
        onClick={() => setShowDropdown(!showDropdown)}
        style={{ border: "none" }}
      >
        {/* Profile Avatar */}
        <div className="position-relative me-2">
          <div
            className="rounded-circle bg-primary d-flex align-items-center justify-content-center text-white fw-bold"
            style={{ width: "35px", height: "35px", fontSize: "16px" }}
          >
            {user.name ? user.name.charAt(0).toUpperCase() : "U"}
          </div>

          {/* Unread Badge with pulse animation */}
          {unreadCount > 0 && (
            <span
              className="position-absolute top-0 start-100 translate-middle badge rounded-pill bg-danger"
              style={{
                fontSize: "10px",
                animation: "pulse 2s infinite",
              }}
            >
              {unreadCount > 99 ? "99+" : unreadCount}
            </span>
          )}
        </div>

        <span className="d-none d-md-inline">{user.name}</span>
      </button>

      {/* Dropdown Menu */}
      {showDropdown && (
        <>
          {/* Backdrop */}
          <div
            className="position-fixed top-0 start-0 w-100 h-100"
            style={{ zIndex: 1040 }}
            onClick={() => setShowDropdown(false)}
          />

          {/* Dropdown */}
          <div
            className="dropdown-menu dropdown-menu-end show position-absolute shadow"
            style={{ right: 0, top: "100%", zIndex: 1050, minWidth: "280px" }}
          >
            {/* User Info Header */}
            <div className="dropdown-header bg-light">
              <div className="d-flex align-items-center">
                <div
                  className="rounded-circle bg-primary d-flex align-items-center justify-content-center text-white fw-bold me-2"
                  style={{ width: "30px", height: "30px", fontSize: "14px" }}
                >
                  {user.name ? user.name.charAt(0).toUpperCase() : "U"}
                </div>
                <div>
                  <div className="fw-bold">{user.name}</div>
                  <small className="text-muted">{user.email}</small>
                </div>
              </div>

              {unreadCount > 0 && (
                <div className="mt-2">
                  <div className="d-flex align-items-center">
                    <span className="badge bg-danger me-2">
                      <i className="bi bi-envelope-fill me-1"></i>
                      {unreadCount}
                    </span>
                    <small className="text-muted">
                      unread message{unreadCount !== 1 ? "s" : ""}
                    </small>
                  </div>
                </div>
              )}
            </div>

            <div className="dropdown-divider"></div>

            {/* Menu Items */}
            <a
              className="dropdown-item d-flex align-items-center"
              href="#"
              onClick={(e) => e.preventDefault()}
            >
              <i className="bi bi-person-fill me-2 text-primary"></i>
              View Profile
            </a>

            <a
              className="dropdown-item d-flex align-items-center"
              href="#"
              onClick={(e) => e.preventDefault()}
            >
              <i className="bi bi-gear-fill me-2 text-secondary"></i>
              Settings
            </a>

            <a
              className="dropdown-item d-flex align-items-center"
              href="#"
              onClick={(e) => e.preventDefault()}
            >
              <i className="bi bi-bell-fill me-2 text-warning"></i>
              Notifications
              {unreadCount > 0 && (
                <span className="badge bg-warning text-dark ms-auto">
                  {unreadCount}
                </span>
              )}
            </a>

            <div className="dropdown-divider"></div>

            <button
              className="dropdown-item d-flex align-items-center text-danger"
              onClick={handleLogout}
            >
              <i className="bi bi-box-arrow-right me-2"></i>
              Logout
            </button>
          </div>
        </>
      )}

      {/* Add CSS for pulse animation */}
      <style jsx>{`
        @keyframes pulse {
          0% {
            transform: scale(1);
          }
          50% {
            transform: scale(1.1);
          }
          100% {
            transform: scale(1);
          }
        }
      `}</style>
    </div>
  );
}
