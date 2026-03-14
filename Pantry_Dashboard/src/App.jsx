import { useState, useEffect } from "react";
import culturalFoodProfiles from "./data/culturalFoodProfiles";
import { calculateCultureScore } from "./lib/culturalMatch";
import supplyProfiles from "./data/supply_profiles.json";
import CulturalMatchCard from "./components/CulturalMatchCard";
import FeedbackForm from "./components/FeedbackForm";
import FeedbackSummaryCard from "./components/FeedbackSummaryCard";
import { getResources } from "./lib/lemontreeApi";
import "./App.css";

function App() {

  const [view, setView] = useState("dashboard");
  const [resources, setResources] = useState([]);
  useEffect(() => {
    getResources({ take: 50 }).then((data) => {
      if (data?.resources?.length) setResources(data.resources);
    }).catch(() => {});
  }, []);

  const [selectedNeighborhood, setSelectedNeighborhood] = useState("All");
  const [selectedMatchLevel, setSelectedMatchLevel] = useState("All");
  const [selectedCulture, setSelectedCulture] = useState("All");
  const [topFilter, setTopFilter] = useState("All");

  const pantries = supplyProfiles.pantries || [];
  const totalImages = supplyProfiles.total_images || 0;

  function normalizeFood(food) {

    const item = food.toLowerCase();

    if (item.includes("rice")) return "rice";
    if (item.includes("bean")) return "beans";
    if (item.includes("lentil")) return "lentils";
    if (item.includes("chickpea")) return "chickpeas";

    if (item.includes("banana")) return "banana";
    if (item.includes("plantain")) return "plantains";

    if (item.includes("tomato")) return "tomato";
    if (item.includes("onion")) return "onion";
    if (item.includes("potato")) return "potato";

    if (item.includes("apple")) return "apple";
    if (item.includes("bread")) return "bread";
    if (item.includes("milk")) return "milk";

    if (item.includes("pasta")) return "pasta";

    if (item.includes("chicken")) return "chicken";
    if (item.includes("pork")) return "pork";
    if (item.includes("beef")) return "beef";
    if (item.includes("tofu")) return "tofu";
    if (item.includes("noodle")) return "noodles";
    if (item.includes("ginger")) return "ginger";
    if (item.includes("garlic")) return "garlic";
    if (item.includes("soy")) return "soy sauce";

    return item;
  }


  const pantryResults = pantries.map((p) => {

    const foods = p.foods || [];
    const normalizedFoods = foods.map(normalizeFood);
    const uniqueFoods = [...new Set(normalizedFoods)];

    console.log("Pantry foods:", uniqueFoods);

    const culturalScores = {};

    Object.entries(culturalFoodProfiles).forEach(([culture, cultureFoods]) => {

      culturalScores[culture] =
        calculateCultureScore(uniqueFoods, cultureFoods);

    });

    const bestCultureEntry =
      Object.entries(culturalScores)
      .sort((a,b)=> b[1]-a[1])[0] || ["Unknown",0];

    const bestCulture = bestCultureEntry[0];
    const score = bestCultureEntry[1];

    const missing =
      culturalFoodProfiles[bestCulture]
        ? culturalFoodProfiles[bestCulture].filter(
            food => !uniqueFoods.includes(food)
          )
        : [];

    const foodCounts = {};

    normalizedFoods.forEach(food => {
      foodCounts[food] = (foodCounts[food] || 0) + 1;
    });

    const topFoods = Object.entries(foodCounts)
      .sort((a,b)=> b[1]-a[1])
      .slice(0,3);

    return {
      pantry: p.pantry_name || "Unknown Pantry",
      neighborhood: p.neighborhood || "Unknown",
      zipcode: p.zipcode || "",
      culture: bestCulture,
      score,
      missing,
      topFoods
    };

  });

  const neighborhoodScores = {};

  pantryResults.forEach(p => {

    const neighborhood = p.neighborhood;

    if (!neighborhoodScores[neighborhood]) {

      neighborhoodScores[neighborhood] = {
        totalScore: 0,
        count: 0
      };

    }

    neighborhoodScores[neighborhood].totalScore += p.score;
    neighborhoodScores[neighborhood].count += 1;

  });

  const neighborhoodAverages =
    Object.entries(neighborhoodScores).map(
      ([name,data]) => ({

        name,
        avgScore: data.count
          ? data.totalScore / data.count
          : 0

      })
    );

  neighborhoodAverages.sort((a,b)=> a.avgScore - b.avgScore);

  const neighborhoods = [
    "All",
    ...new Set(
      pantryResults.map(p => p.neighborhood)
    )
  ];

  const cultures = [
    "All",
    ...Object.keys(culturalFoodProfiles)
  ];

  const filteredPantries = pantryResults.filter(p => {

    const neighborhood = p.neighborhood;

    const neighborhoodMatch =
      selectedNeighborhood === "All" ||
      neighborhood === selectedNeighborhood;

    const cultureMatch =
      selectedCulture === "All" ||
      p.culture === selectedCulture;

    const matchLevel =
      p.score >= 80
        ? "High"
        : p.score >= 40
        ? "Moderate"
        : "Low";

    const matchFilter =
      selectedMatchLevel === "All" ||
      matchLevel === selectedMatchLevel;

    return neighborhoodMatch && matchFilter && cultureMatch;

  });

  let sortedPantries = [...filteredPantries];

  if (topFilter === "Top 20") {

    sortedPantries =
      sortedPantries
      .sort((a,b)=> b.score - a.score)
      .slice(0,20);

  }

  if (topFilter === "Bottom 20") {

    sortedPantries =
      sortedPantries
      .sort((a,b)=> a.score - b.score)
      .slice(0,20);

  }

  return (

    <div className="dashboard">

      <div className="view-tabs">
        <button
          type="button"
          className={view === "dashboard" ? "active" : ""}
          onClick={() => setView("dashboard")}
        >
          Dashboard
        </button>
        <button
          type="button"
          className={view === "feedback" ? "active" : ""}
          onClick={() => setView("feedback")}
        >
          Resource Feedback
        </button>
      </div>

      {view === "feedback" ? (
        <div className="feedback-view">
          <h1>Resource Feedback</h1>
          <p className="subtitle">
            Submit and view feedback for food pantries and soup kitchens
          </p>
          <div className="feedback-layout">
            <div className="feedback-form-wrapper pantry-card">
              <FeedbackForm resources={resources} />
            </div>
            <div className="feedback-summary-wrapper">
              <FeedbackSummaryCard />
            </div>
          </div>
        </div>
      ) : (
        <>
      <h1>NYC Pantry Dashboard</h1>

      <p className="subtitle">
        Cultural Food Match Analysis based on AI-detected pantry supply
      </p>

      <div className="summary-panel">

        <div className="summary-card">
          <h3>Images Analyzed</h3>
          <p>{totalImages}</p>
        </div>

        <div className="summary-card">
          <h3>Pantries Detected</h3>
          <p>{pantryResults.length}</p>
        </div>

      </div>

      <div className="filter-panel">

        <label>Neighborhood</label>

        <select
          value={selectedNeighborhood}
          onChange={(e)=>setSelectedNeighborhood(e.target.value)}
        >
          {neighborhoods.map((n,i)=>(
            <option key={i}>{n}</option>
          ))}
        </select>

        <label>Culture</label>

        <select
          value={selectedCulture}
          onChange={(e)=>setSelectedCulture(e.target.value)}
        >
          {cultures.map((c,i)=>(
            <option key={i}>{c}</option>
          ))}
        </select>

        <label>Cultural Match</label>

        <select
          value={selectedMatchLevel}
          onChange={(e)=>setSelectedMatchLevel(e.target.value)}
        >
          <option>All</option>
          <option>High</option>
          <option>Moderate</option>
          <option>Low</option>
        </select>

        <label>Top Results</label>

        <select
          value={topFilter}
          onChange={(e)=>setTopFilter(e.target.value)}
        >
          <option>All</option>
          <option>Top 20</option>
          <option>Bottom 20</option>
        </select>

      </div>

      <div className="pantry-card">

        <h3>Neighborhood Cultural Food Access</h3>

        <ul className="neighborhood-list">
          {neighborhoodAverages.slice(0,10).map((n,i)=>(
            <li key={i}>
              {n.name} — {n.avgScore.toFixed(1)}%
            </li>
          ))}
        </ul>

      </div>

      <div className="pantry-grid">

        {sortedPantries.map((pantry,index)=>(

          <div key={index} className="pantry-card">

            <h3>{pantry.pantry}</h3>

            <p style={{fontWeight:"bold"}}>
              {selectedCulture === "All"
                ? `${pantry.culture} Cultural Match`
                : `${selectedCulture} Cultural Match`}
            </p>

            <CulturalMatchCard score={pantry.score} />

            {pantry.score < 40 && (
              <p style={{
                color:"#d9534f",
                fontWeight:"bold",
                marginTop:"8px"
              }}>
                ⚠ Low Cultural Food Access
              </p>
            )}

            <p style={{
              fontWeight:"bold",
              marginTop:"10px"
            }}>
              Missing culturally relevant foods:
            </p>

            <ul>
              {pantry.missing.map((food,i)=>(
                <li key={i}>{food}</li>
              ))}
            </ul>

            <p style={{
              fontWeight:"bold",
              marginTop:"10px"
            }}>
              Top Foods Detected
            </p>

            <ul>
              {pantry.topFoods.map(([food,count],i)=>(
                <li key={i}>{food} ({count})</li>
              ))}
            </ul>

          </div>

        ))}

      </div>

        </>
      )}

    </div>

  );

}

export default App;