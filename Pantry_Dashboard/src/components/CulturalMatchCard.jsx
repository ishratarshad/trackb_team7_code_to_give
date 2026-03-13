function CulturalMatchCard({ score }) {

  let label = "";
  let color = "";

  if (score >= 75) {
    label = "High Cultural Match";
    color = "#22c55e"; // green
  } else if (score >= 50) {
    label = "Moderate Cultural Match";
    color = "#f59e0b"; // yellow
  } else {
    label = "Low Cultural Match";
    color = "#ef4444"; // red
  }

  return (
    <div style={{
      padding: "15px",
      borderRadius: "10px",
      background: "#f9fafb",
      borderLeft: `6px solid ${color}`
    }}>
      <h2 style={{ margin: 0 }}>{score}%</h2>
      <p style={{ margin: "5px 0", fontWeight: "bold", color }}>{label}</p>
    </div>
  );
}

export default CulturalMatchCard;