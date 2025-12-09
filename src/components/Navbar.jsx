import { useContext } from "react";
import { AuthContext } from "../context/AuthContext";
import { Link } from "react-router-dom";
import Profile from "../pages/Profile"; // Import Profile component

export default function AppNavbar() {
  const { user } = useContext(AuthContext); // Remove logout since it's now in Profile

  return (
    <nav className="navbar navbar-dark bg-dark px-3 d-flex justify-content-between">
      <Link to="/dashboard" className="navbar-brand">
        <i className="fas fa-comments me-2"></i>
        Chat App
      </Link>

      {user && (
        <div className="d-flex align-items-center">
          {/* Navigation Links */}
          <div className="navbar-nav flex-row me-3 d-none d-md-flex">
            <Link to="/dashboard" className="nav-link me-3">
              <i className="fas fa-home me-1"></i>
              Dashboard
            </Link>
            <Link to="/chat" className="nav-link me-3">
              <i className="fas fa-comments me-1"></i>
              Chat
            </Link>
          </div>

          {/* Profile Component */}
          <Profile />
        </div>
      )}
    </nav>
  );
}
