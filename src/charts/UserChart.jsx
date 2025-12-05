import { Bar } from "react-chartjs-2";
import { Chart, BarElement, CategoryScale, LinearScale } from "chart.js";

Chart.register(BarElement, CategoryScale, LinearScale);

export default function UserChart() {
  const data = {
    labels: ["Mon", "Tue", "Wed", "Thu", "Fri"],
    datasets: [
      {
        label: "Active Users",
        data: [5, 10, 7, 12, 8],
        backgroundColor: "rgba(54, 162, 235, 0.7)",
      },
    ],
  };

  return <Bar data={data} />;
}
