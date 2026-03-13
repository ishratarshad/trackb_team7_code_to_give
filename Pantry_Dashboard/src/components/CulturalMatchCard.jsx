function CulturalMatchCard({ score }) {

  let color = "#e74c3c"; // red

  if (score >= 80) {
    color = "#2ecc71"; // green
  } else if (score >= 40) {
    color = "#f1c40f"; // yellow
  }

  return (

    <div style={{ marginTop: "10px" }}>

      <div style={{ fontWeight: "bold", marginBottom: "5px" }}>
        Cultural Match Score: {score.toFixed(1)}%
      </div>

      <div
        style={{
          width: "100%",
          height: "10px",
          background: "#eee",
          borderRadius: "6px",
          overflow: "hidden"
        }}
      >

        <div
          style={{
            width: `${score}%`,
            height: "100%",
            background: color
          }}
        />

      </div>

    </div>

  );

}

export default CulturalMatchCard;
