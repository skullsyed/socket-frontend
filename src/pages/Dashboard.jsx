import UserChart from "../charts/UserChart";
import UserList from "../components/UserList";
export default function Dashboard() {
  return (
    <div className="container mt-4 d-flex justify-content-between">
      <UserList />
      <div>
        <h2>Dashboard</h2>
        <UserChart />
      </div>
      {/* <Link>Friends</Link> */}
    </div>
  );
}
