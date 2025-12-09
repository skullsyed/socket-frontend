import { useContext } from "react";
import { AuthContext } from "../context/AuthContext";
import { Link } from "react-router-dom";
import Profile from "../pages/Profile";

export default function AppNavbar() {
  const { user } = useContext(AuthContext);

  return (
    <nav className="navbar navbar-expand-lg navbar-dark bg-dark shadow">
      <div className="container-fluid px-3">
        <Link
          to="/dashboard"
          className="navbar-brand d-flex align-items-center"
        >
          <i className="bi bi-chat-square-text-fill me-2"></i>
          <span className="fw-bold">Chat App</span>
        </Link>

        {user && (
          <>
            {/* Mobile menu button */}
            <button
              className="navbar-toggler d-lg-none"
              type="button"
              data-bs-toggle="collapse"
              data-bs-target="#navbarNav"
            >
              <span className="navbar-toggler-icon"></span>
            </button>

            <div className="collapse navbar-collapse" id="navbarNav">
              <ul className="navbar-nav me-auto">
                <li className="nav-item">
                  <Link
                    to="/dashboard"
                    className="nav-link d-flex align-items-center"
                  >
                    <i className="bi bi-house-fill me-1"></i>
                    Dashboard
                  </Link>
                </li>
                <li className="nav-item">
                  <Link
                    to="/chat"
                    className="nav-link d-flex align-items-center"
                  >
                    <i className="bi bi-chat-dots-fill me-1"></i>
                    Chat
                  </Link>
                </li>
              </ul>

              <div className="d-flex align-items-center">
                <Profile />
              </div>
            </div>
          </>
        )}
      </div>
    </nav>
  );
}
