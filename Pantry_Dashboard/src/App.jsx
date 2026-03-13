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

return (
  <div className="dashboard">
    <h1>NYC Pantry Dashboard</h1>
    <p className="subtitle">Cultural Food Match Analysis</p>

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