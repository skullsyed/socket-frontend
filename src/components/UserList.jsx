import { useEffect, useState } from "react";
import axios from "axios";

export default function UserList() {
  const [loading, setLoading] = useState(true);
  const [users, setUsers] = useState("syed");

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const { data } = await axios.get(
          "http://localhost:5000/api/auth/getAllUser",
          {
            headers: {
              "Cache-Control": "no-cache",
              Pragma: "no-cache",
              Expires: "0",
            },
          }
        );
        setUsers(data.data); // store full user list
        setUsername(data[0]?.name || "No User");
      } catch (error) {
        console.error(error.message);
      }
      setLoading(false);
    };

    fetchData();
  }, []);

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
        users.map((u) => (
          <a key={u._id} className="nav-link">
            {u.name}
          </a>
        ))}
    </nav>
  );
}
