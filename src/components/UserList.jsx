import { useContext, useEffect, useState } from "react";
import axios from "axios";
import API from "../api/axiosConfig";
import { AuthContext } from "../context/AuthContext";

export default function UserList({ onUserSelect }) {
  const { user } = useContext(AuthContext);
  const [loading, setLoading] = useState(true);
  const [users, setUsers] = useState([]);
  const [username, setUsername] = useState("");

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
        setUsername(filteredUsers[0]?.name || "No User");
      } catch (error) {
        console.error(error.message);
      }
      setLoading(false);
    };

    fetchData();
  }, [user]);

  return (
    <nav className="nav flex-column">
      <a
        className="btn btn-primary"
        data-bs-toggle="offcanvas"
        href="#offcanvasExample"
        role="button"
        aria-controls="offcanvasExample"
      >
        Users
      </a>

      {/* Loader */}
      {loading && <p className="nav-link">Loading...</p>}

      {/* List users */}
      {!loading &&
        Array.isArray(users) &&
        users.map((u) => (
          <a
            key={u._id}
            className="nav-link"
            onClick={() => onUserSelect && onUserSelect(u)} // Add click handler
            style={{ cursor: "pointer" }}
          >
            {u.name}
          </a>
        ))}
    </nav>
  );
}
