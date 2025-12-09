import { useState } from "react";
import UserChart from "../charts/UserChart";
import UserList from "../components/UserList";
import Chat from "./Chat";

export default function Dashboard() {
  const [selectedUser, setSelectedUser] = useState(null);

  const handleCloseChat = () => {
    setSelectedUser(null);
  };

  return (
    <div className="container-fluid mt-4">
      <div className="row g-3">
        {/* User List Sidebar */}
        <div className="col-md-3">
          <div className="card h-100">
            <div className="card-header bg-primary text-white">
              <h6 className="mb-0">
                <i className="bi bi-people-fill me-2"></i>
                Available Users
              </h6>
            </div>
            <div className="card-body p-0">
              <UserList
                onUserSelect={setSelectedUser}
                selectedUser={selectedUser}
              />
            </div>
          </div>
        </div>

        {/* Chat Area */}
        <div className="col-md-6">
          <Chat selectedUser={selectedUser} onClose={handleCloseChat} />
        </div>

        {/* Dashboard Stats */}
        <div className="col-md-3">
          <div className="card mb-3">
            <div className="card-header bg-info text-white">
              <h6 className="mb-0">
                <i className="bi bi-bar-chart-fill me-2"></i>
                Dashboard Stats
              </h6>
            </div>
            <div className="card-body">
              <UserChart />
            </div>
          </div>

          {/* Additional Dashboard Info */}
          <div className="card">
            <div className="card-header bg-success text-white">
              <h6 className="mb-0">
                <i className="bi bi-info-circle-fill me-2"></i>
                Quick Info
              </h6>
            </div>
            <div className="card-body">
              <div className="d-flex justify-content-between mb-2">
                <span>Active Chats:</span>
                <span className="badge bg-primary">{selectedUser ? 1 : 0}</span>
              </div>
              <div className="d-flex justify-content-between mb-2">
                <span>Selected User:</span>
                <span className="text-muted">
                  {selectedUser ? selectedUser.name : "None"}
                </span>
              </div>
              <div className="d-flex justify-content-between">
                <span>Status:</span>
                <span className="badge bg-success">Online</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Mobile Layout - Chat Full Screen */}
      <div className="d-md-none mt-3">
        {selectedUser && (
          <div
            className="position-fixed top-0 start-0 w-100 h-100 bg-white"
            style={{ zIndex: 1050 }}
          >
            <div className="d-flex justify-content-between align-items-center p-3 bg-primary text-white">
              <h6 className="mb-0">Chat with {selectedUser.name}</h6>
              <button
                className="btn btn-outline-light btn-sm"
                onClick={() => setSelectedUser(null)}
              >
                <i className="bi bi-x-lg"></i>
              </button>
            </div>
            <div className="h-100">
              <Chat selectedUser={selectedUser} onClose={handleCloseChat} />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
