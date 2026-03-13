import CulturalMatchCard from "./components/CulturalMatchCard";
import { calculateCulturalMatch, getMissingFoods } from "./utils/culturalMatch";
import pantryData from "./data/pantryData.json";
import "./App.css";


function App() {
  const pantries = pantryData.pantries;

  // South Asian demographic foods (example - would come from demographics API later)
  const demographicFoods = ["rice", "lentils", "chickpeas", "curry", "naan", "halal"];

  const pantryScores = pantries.map((pantry) => {
    // Normalize food names to lowercase for better matching
    const normalizedFoods = pantry.foods.map(f => f.toLowerCase());

    return {
      id: pantry.id,
      name: pantry.name,
      neighborhood: pantry.neighborhood,
      zipCode: pantry.zipCode,
      imageCount: pantry.imageCount,
      totalFoods: pantry.foods.length,
      score: calculateCulturalMatch(normalizedFoods, demographicFoods),
      missingFoods: getMissingFoods(normalizedFoods, demographicFoods),
      flags: pantry.flags
    };
  });

  const totalPantries = pantryScores.length;

  const averageScore =
    pantryScores.reduce((sum, p) => sum + p.score, 0) / totalPantries;

  const lowMatchCount =
    pantryScores.filter((p) => p.score < 50).length;


return (
  <div className="dashboard">
    <h1>Food Pantry Cultural Match Dashboard</h1>
    <p className="subtitle">AI-Classified Food Analysis from {pantryData.stats.totalImages} Food Photos</p>

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

      <div className="summary-card">
        <h3>Total Images Classified</h3>
        <p>{pantryData.stats.totalImages}</p>
      </div>
    </div>

    <div className="pantry-grid">
      {pantryScores.slice(0, 50).map((pantry) => (
        <div key={pantry.id} className="pantry-card">
          <h3>{pantry.name}</h3>
          <p style={{ fontSize: '0.9em', color: '#666', marginTop: '5px' }}>
            {pantry.neighborhood}, {pantry.zipCode}
          </p>
          <p style={{ fontSize: '0.85em', color: '#999' }}>
            {pantry.imageCount} photos • {pantry.totalFoods} food items
          </p>

          <CulturalMatchCard score={pantry.score} />

          <div style={{ marginTop: '10px' }}>
            <p style={{ fontWeight: 'bold', marginBottom: '5px' }}>Food Inventory:</p>
            <div style={{ display: 'flex', gap: '5px', flexWrap: 'wrap' }}>
              {pantry.flags.hasFreshProduce && <span className="badge">🥬 Produce</span>}
              {pantry.flags.hasMeat && <span className="badge">🍗 Meat</span>}
              {pantry.flags.hasDairy && <span className="badge">🥛 Dairy</span>}
              {pantry.flags.hasGrains && <span className="badge">🌾 Grains</span>}
              {pantry.flags.hasCanned && <span className="badge">🥫 Canned</span>}
            </div>
          </div>

          {pantry.missingFoods.length > 0 && (
            <div style={{ marginTop: '10px' }}>
              <p style={{ fontWeight: 'bold', fontSize: '0.9em' }}>
                Missing cultural foods:
              </p>
              <ul style={{ fontSize: '0.85em', marginTop: '5px' }}>
                {pantry.missingFoods.map((food, i) => (
                  <li key={i}>{food}</li>
                ))}
              </ul>
            </div>
          )}
        </div>
      ))}
    </div>

    <p style={{ textAlign: 'center', color: '#666', marginTop: '30px', fontSize: '0.9em' }}>
      Showing first 50 of {totalPantries} pantries •
      Data generated: {new Date(pantryData.generatedAt).toLocaleString()}
    </p>
  </div>
);
}

export default App;