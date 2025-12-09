import { useContext, useState } from "react";
import { AuthContext } from "../context/AuthContext";

export default function Profile() {
  const { user, logout } = useContext(AuthContext);
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
        className="btn btn-link dropdown-toggle d-flex align-items-center"
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
        <span className="d-none d-md-inline">{user.name}</span>
      </button>

      {/* Dropdown Menu */}
      {showDropdown && (
        <div
          className="dropdown-menu dropdown-menu-end show position-absolute"
          style={{ right: 0, top: "100%" }}
        >
          <div className="dropdown-header">
            <strong>{user.name}</strong>
            <br />
            <small className="text-muted">{user.email}</small>
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
          style={{ zIndex: -1 }}
          onClick={() => setShowDropdown(false)}
        />
      )}
    </div>
  );
}
