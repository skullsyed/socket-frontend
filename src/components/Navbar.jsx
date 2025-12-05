import { useContext } from "react";
import { AuthContext } from "../context/AuthContext";
import { Link } from "react-router-dom";

export default function AppNavbar() {
  const { user, logout } = useContext(AuthContext);

  return (
    <nav className="navbar navbar-dark bg-dark px-3">
      <Link to="/chat" className="navbar-brand">
        Chat App
      </Link>

      {user && (
        <button className="btn btn-danger" onClick={logout}>
          Logout
        </button>
      )}
    </nav>
  );
}
