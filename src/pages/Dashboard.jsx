import UserChart from "../charts/UserChart";
import UserList from "../components/UserList";
import { useState } from "react";
import Chat from "./Chat";
export default function Dashboard() {
  const [selectedUser, setSelectedUser] = useState(null);
  return (
    <div className="container mt-4 d-flex justify-content-between">
      <UserList onUserSelect={setSelectedUser} />
      <Chat selectedUser={selectedUser} />
      <div>
        <h2>Dashboard</h2>
        <UserChart />
      </div>
      {/* <Link>Friends</Link> */}
    </div>
  );
}
