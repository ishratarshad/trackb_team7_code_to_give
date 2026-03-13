import CulturalMatchCard from "./components/CulturalMatchCard";
import { calculateCulturalMatch } from "./utils/culturalMatch";
import { pantries } from "./data/pantries";
import "./App.css";

function App() {

  const demographicFoods = ["rice", "lentils", "chickpeas"];

  const pantryScores = pantries.map((pantry) => {
    return {
      name: pantry.name,
      score: calculateCulturalMatch(pantry.foods, demographicFoods)
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
        </div>
      ))}
    </div>
  </div>
);
}

export default App;