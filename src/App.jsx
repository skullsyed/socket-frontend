import { BrowserRouter, Routes, Route } from "react-router-dom";
import AppNavbar from "./components/Navbar";
import Login from "./pages/Login";
import Register from "./pages/Register";
import Dashboard from "./pages/Dashboard";
import Chat from "./pages/Chat";
import ProtectedRoute from "./components/ProtectedRoute";
import { AuthProvider, AuthContext } from "./context/AuthContext";
import { SocketProvider } from "./context/SocketContext";
import { MessageProvider } from "./context/MessageContext";

export default function App() {
  // const { loading } = useContext(AuthContext);

  // if (loading) {
  //   return (
  //     <div
  //       className="d-flex justify-content-center align-items-center"
  //       style={{ height: "100vh" }}
  //     >
  //       <div className="text-center">
  //         <div className="spinner-border text-primary" role="status">
  //           <span className="visually-hidden">Loading...</span>
  //         </div>
  //         <p className="mt-3">Loading Chat App...</p>
  //       </div>
  //     </div>
  //   );
  // }
  return (
    <AuthProvider>
      <SocketProvider>
        <MessageProvider>
          <BrowserRouter>
            <AppNavbar />

            <Routes>
              <Route path="/login" element={<Login />} />
              <Route path="/register" element={<Register />} />

              <Route
                path="/dashboard"
                element={
                  <ProtectedRoute>
                    <Dashboard />
                  </ProtectedRoute>
                }
              />

              <Route
                path="/chat"
                element={
                  <ProtectedRoute>
                    <Chat />
                  </ProtectedRoute>
                }
              />
            </Routes>
          </BrowserRouter>
        </MessageProvider>
      </SocketProvider>
    </AuthProvider>
  );
}
