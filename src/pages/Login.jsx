import { useState, useContext } from "react";
import API from "../api/axiosConfig";
import { AuthContext } from "../context/AuthContext";
import { useNavigate, Link } from "react-router-dom";

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const { login } = useContext(AuthContext);

  const navigate = useNavigate();

  const handleLogin = async (e) => {
    e.preventDefault();

    const res = await API.post("/api/auth/login", { email, password });
    login(res.data.user, res.data.token);
    navigate("/");
  };

  return (
    <div className="container mt-5">
      <h2>Login</h2>

      <form onSubmit={handleLogin} className="mt-4">
        <input
          className="form-control mb-3"
          placeholder="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />

        <input
          className="form-control mb-3"
          type="password"
          placeholder="Password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />

        <button className="btn btn-primary w-100">Login</button>
      </form>

      <p className="mt-3">
        Don't have an account? <Link to="/register">Register</Link>
      </p>
    </div>
  );
}
