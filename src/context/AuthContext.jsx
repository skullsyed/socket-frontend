import { createContext, useState, useEffect, useCallback } from "react";
import API from "../api/axiosConfig";

export const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true); // Add loading state
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  // Function to check if token is valid
  const validateToken = useCallback(async () => {
    const token = localStorage.getItem("token");
    const storedUser = localStorage.getItem("chatUser");

    if (!token || !storedUser) {
      setLoading(false);
      return false;
    }

    try {
      // Verify token with backend
      const response = await API.get("/api/auth/verify-token", {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (response.data.valid) {
        setUser(JSON.parse(storedUser));
        setIsAuthenticated(true);
        setLoading(false);
        return true;
      } else {
        // Token is invalid, clear storage
        localStorage.clear();
        setUser(null);
        setIsAuthenticated(false);
        setLoading(false);
        return false;
      }
    } catch (error) {
      console.error("Token validation error:", error);

      // If it's a 401 error, token is expired/invalid
      if (error.response?.status === 401) {
        localStorage.clear();
        setUser(null);
        setIsAuthenticated(false);
      }

      setLoading(false);
      return false;
    }
  }, []);

  // Check authentication on app load
  useEffect(() => {
    validateToken();
  }, [validateToken]);

  // Set up token expiration checker
  useEffect(() => {
    if (!isAuthenticated) return;

    const checkTokenExpiration = () => {
      const token = localStorage.getItem("token");
      if (token) {
        try {
          // Decode JWT token to check expiration (if using JWT)
          const payload = JSON.parse(atob(token.split(".")[1]));
          const currentTime = Date.now() / 1000;

          if (payload.exp && payload.exp < currentTime) {
            console.log("Token expired");
            logout();
          }
        } catch (error) {
          // If token is not JWT or can't be decoded, validate with server
          validateToken();
        }
      }
    };

    // Check token expiration every 5 minutes
    const interval = setInterval(checkTokenExpiration, 5 * 60 * 1000);

    return () => clearInterval(interval);
  }, [isAuthenticated, validateToken]);

  const login = (userData, token) => {
    localStorage.setItem("chatUser", JSON.stringify(userData));
    localStorage.setItem("token", token);
    setUser(userData);
    setIsAuthenticated(true);
  };

  const logout = useCallback(() => {
    localStorage.clear();
    setUser(null);
    setIsAuthenticated(false);

    // Redirect to login page
    window.location.href = "/login";
  }, []);

  // Add axios interceptor for automatic logout on 401
  useEffect(() => {
    const interceptor = API.interceptors.response.use(
      (response) => response,
      (error) => {
        if (error.response?.status === 401 && isAuthenticated) {
          console.log("401 error, logging out");
          logout();
        }
        return Promise.reject(error);
      }
    );

    return () => API.interceptors.response.eject(interceptor);
  }, [logout, isAuthenticated]);

  return (
    <AuthContext.Provider
      value={{
        user,
        login,
        logout,
        loading,
        isAuthenticated,
        validateToken,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};
