export default function CulturalMatchCard({ score }) {
  let label = "Low Match";
  let color = "#dc2626";

  if (score >= 75) {
    label = "High Match";
    color = "#16a34a";
  } else if (score >= 50) {
    label = "Moderate Match";
    color = "#d97706";
  }

  return (
    <div>
      <p style={{ margin: "0 0 8px 0", color: "#6b7280" }}>Cultural Match Score</p>
      <h2 style={{ margin: "0", fontSize: "32px", color }}>{score}%</h2>
      <p style={{ marginTop: "8px", fontWeight: "bold", color }}>{label}</p>
    </div>
  );
}