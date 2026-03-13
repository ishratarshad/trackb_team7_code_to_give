import CulturalMatchCard from "./components/CulturalMatchCard";
import { calculateCulturalMatch, getMissingFoods } from "./utils/culturalMatch";
import classifierData from "./data/classifierOutput.json";
import "./App.css";


function App() {
  const pantries = classifierData.pantries;

  const demographicFoods = ["rice", "lentils", "chickpeas"];

  const pantryScores = pantries.map((pantry) => {
    return {
      name: pantry.name,
      score: calculateCulturalMatch(pantry.foods, demographicFoods),
      missingFoods: getMissingFoods(pantry.foods, demographicFoods)
    };
  });
  const totalPantries = pantryScores.length;

  const averageScore =
    pantryScores.reduce((sum, p) => sum + p.score, 0) / totalPantries;

  const lowMatchCount =
    pantryScores.filter((p) => p.score < 50).length;


return (
  <div className="dashboard">
    <h1>NYC Pantry Dashboard</h1>
    <p className="subtitle">Cultural Food Match Analysis</p>

    <div className="summary-panel">
      <div className="summary-card">
        <h3>Pantries Analyzed</h3>
        <p>{totalPantries}</p>
      </div>

      <div className="summary-card">
        <h3>Average Cultural Match</h3>
        <p>{averageScore.toFixed(1)}%</p>
      </div>

      <div className="summary-card">
        <h3>Low Match Pantries</h3>
        <p>{lowMatchCount}</p>
      </div>
    </div>

    <div className="pantry-grid">
      {pantryScores.map((pantry, index) => (
        <div key={index} className="pantry-card">
          <h3>{pantry.name}</h3>

          <CulturalMatchCard score={pantry.score} />

          <p style={{ marginTop: "10px", fontWeight: "bold" }}>
            Missing culturally relevant foods:
          </p>

          <ul>
            {pantry.missingFoods.map((food, i) => (
              <li key={i}>{food}</li>
            ))}
          </ul>
        </div>
      ))}
    </div>
  </div>
);
}

export default App;