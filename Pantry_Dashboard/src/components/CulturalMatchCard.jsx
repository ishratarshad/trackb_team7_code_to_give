function CulturalMatchCard({ score }) {

  let level = "Low Cultural Match";

  if (score >= 70) {
    level = "High Cultural Match";
  } else if (score >= 40) {
    level = "Moderate Cultural Match";
  }

  return (
    <div className="cultural-card">
      <h3>Cultural Match Score</h3>

      <p style={{ fontSize: "24px", fontWeight: "bold" }}>
        {score.toFixed(1)}%
      </p>

      <p>{level}</p>
    </div>
  );
}

export default CulturalMatchCard;