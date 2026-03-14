import { useState, useEffect } from "react";
<<<<<<< HEAD
import supplyProfiles from "./data/supply_profiles.json";
=======
import culturalFoodProfiles from "./data/culturalFoodProfiles";
import { calculateCultureScore } from "./lib/culturalMatch";
import supplyProfiles from "./data/supply_profiles.json";
import CulturalMatchCard from "./components/CulturalMatchCard";
import FeedbackForm from "./components/FeedbackForm";
import FeedbackSummaryCard from "./components/FeedbackSummaryCard";
import { getResources } from "./lib/lemontreeApi";
>>>>>>> 31acece2af70e4f5febbabf5a5b792552fd4df38
import "./App.css";

function App() {

<<<<<<< HEAD
  const [shortages, setShortages] = useState([]);
  const [selectedBorough, setSelectedBorough] = useState("All");
=======
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
>>>>>>> 31acece2af70e4f5febbabf5a5b792552fd4df38
  const [topFilter, setTopFilter] = useState("All");

  const pantries = supplyProfiles || [];
  const totalImages = pantries.length;

  // Fetch shortage analytics from backend
  useEffect(() => {

    const boroughParam =
      selectedBorough === "All"
        ? ""
        : `?neighborhood=${selectedBorough}`;

    fetch(`http://localhost:8000/analytics/shortage${boroughParam}`)
      .then(res => res.json())
      .then(data => {
        setShortages(data.shortages || []);
      })
      .catch(err => {
        console.error("Shortage API error:", err);
      });

  }, [selectedBorough]);

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

    const foods = (p.normalized_foods || []).map(f => f.normalized);

    const normalizedFoods = foods.map(normalizeFood);
    const uniqueFoods = [...new Set(normalizedFoods)];

    const foodCounts = {};

    normalizedFoods.forEach(food => {
      foodCounts[food] = (foodCounts[food] || 0) + 1;
    });

    const topFoods = Object.entries(foodCounts)
      .sort((a,b)=> b[1]-a[1])
      .slice(0,3);

    return {
      pantry: p.pantry_id || "Unknown Pantry",
      neighborhood: p.neighborhood || "Unknown",
      zipcode: p.zipcode || "",
      foods: uniqueFoods,
      topFoods
    };

  });

  const boroughs = [
    "All",
    "Bronx",
    "Brooklyn",
    "Manhattan",
    "Queens",
    "Staten Island"
  ];

  const filteredPantries = pantryResults.filter(p => {

    const boroughMatch =
      selectedBorough === "All" ||
      p.neighborhood === selectedBorough;

    return boroughMatch;

  });

  let sortedPantries = [...filteredPantries];

  if (topFilter === "Top 20") {

    sortedPantries =
      sortedPantries
      .slice()
      .sort((a,b)=> b.topFoods.length - a.topFoods.length)
      .slice(0,20);

  }

  if (topFilter === "Bottom 20") {

    sortedPantries =
      sortedPantries
      .slice()
      .sort((a,b)=> a.topFoods.length - b.topFoods.length)
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
        Food Supply Analysis based on AI-detected pantry inventory
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

        <label>Borough</label>

        <select
          value={selectedBorough}
          onChange={(e)=>setSelectedBorough(e.target.value)}
        >
          {boroughs.map((b,i)=>(
            <option key={i}>{b}</option>
          ))}
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

      {/* Shortage Analytics Section */}

      <div className="summary-card">

        <h3>Top Food Shortages</h3>

        {shortages.length === 0 ? (
          <p>No shortage data available</p>
        ) : (
          <ul>
            {shortages.slice(0,5).map((s,i)=>(
              <li key={i}>
                {s.item} — shortage score {s.shortage_score}
              </li>
            ))}
          </ul>
        )}

      </div>

      <div className="summary-card">

        <h3>Food Availability Insights</h3>

        <ul>
          <li>Fresh Produce → 63.8%</li>
          <li>Protein → 60.1%</li>
          <li>Dairy → 61.5%</li>
          <li>Grains → 93.7%</li>
          <li>Halal Options → 2.1%</li>
          <li>Kosher Options → 1.8%</li>
        </ul>

      </div>

      <div className="pantry-grid">

        {sortedPantries.map((pantry,index)=>(

          <div key={index} className="pantry-card">

            <h3>{pantry.pantry}</h3>

            <p style={{fontWeight:"bold"}}>
              Borough: {pantry.neighborhood}
            </p>

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