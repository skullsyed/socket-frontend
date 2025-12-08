import { useState } from "react";
import UserList from "./UserList";
import Chat from "./Chat";

export default function Home() {
  const [selectedUser, setSelectedUser] = useState(null);

  return (
    <div className="row mt-3">
      <div className="col-3">
        <UserList onSelectUser={setSelectedUser} />
      </div>

      <div className="col-9">
        <Chat selectedUser={selectedUser} />
      </div>
    </div>
  );
}
