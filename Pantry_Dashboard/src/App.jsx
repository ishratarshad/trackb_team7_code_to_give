import { useState, useEffect } from "react";
import supplyProfiles from "./data/supply_profiles.json";
import FeedbackForm from "./components/FeedbackForm";
import FeedbackSummaryCard from "./components/FeedbackSummaryCard";
// DemographicsPieChart available for pantry detail views
// import DemographicsPieChart, { createEthnicityPieData } from "./components/DemographicsPieChart";
import { getResources } from "./lib/lemontreeApi";
import "./App.css";

function App() {
  const [view, setView] = useState("dashboard");
  const [resources, setResources] = useState([]);
  const [shortages, setShortages] = useState([]);
  const [selectedBorough, setSelectedBorough] = useState("All");
  const [topFilter, setTopFilter] = useState("All");
  const [dietaryFilter, setDietaryFilter] = useState("All");

  // Fetch resources from Lemontree API
  useEffect(() => {
    getResources({ take: 50 }).then((data) => {
      if (data?.resources?.length) setResources(data.resources);
    }).catch(() => {});
  }, []);

  // Fetch shortage analytics from backend
  useEffect(() => {
    const boroughParam = selectedBorough === "All" ? "" : `?neighborhood=${selectedBorough}`;
    fetch(`http://localhost:8000/analytics/shortage${boroughParam}`)
      .then(res => res.json())
      .then(data => {
        setShortages(data.shortages || []);
      })
      .catch(err => {
        console.error("Shortage API error:", err);
      });
  }, [selectedBorough]);

  const pantries = supplyProfiles || [];
  const totalImages = pantries.length;

  // Calculate dietary stats from flags
  const dietaryStats = {
    freshProduce: pantries.filter(p => p.flags?.hasFreshProduce).length,
    meat: pantries.filter(p => p.flags?.hasMeat).length,
    dairy: pantries.filter(p => p.flags?.hasDairy).length,
    grains: pantries.filter(p => p.flags?.hasGrains).length,
    halal: pantries.filter(p => p.flags?.hasHalal).length,
    kosher: pantries.filter(p => p.flags?.hasKosher).length,
  };

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
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3);

    return {
      pantry: p.metadata?.resource_name || p.pantry_id || "Unknown Pantry",
      pantry_id: p.pantry_id,
      neighborhood: p.metadata?.neighborhood_name || "Unknown",
      zipcode: p.metadata?.zip_code || "",
      foods: uniqueFoods,
      topFoods,
      flags: p.flags || {},
      dietary_tags: p.dietary_tags || [],
    };
  });

  const boroughs = ["All", "Bronx", "Brooklyn", "Manhattan", "Queens", "Staten Island"];
  const dietaryOptions = ["All", "Halal", "Kosher", "Fresh Produce", "Vegetarian-Friendly"];

  const filteredPantries = pantryResults.filter(p => {
    const boroughMatch = selectedBorough === "All" || p.neighborhood === selectedBorough;

    let dietaryMatch = true;
    if (dietaryFilter === "Halal") {
      dietaryMatch = p.flags?.hasHalal;
    } else if (dietaryFilter === "Kosher") {
      dietaryMatch = p.flags?.hasKosher;
    } else if (dietaryFilter === "Fresh Produce") {
      dietaryMatch = p.flags?.hasFreshProduce;
    } else if (dietaryFilter === "Vegetarian-Friendly") {
      dietaryMatch = !p.flags?.hasMeat;
    }

    return boroughMatch && dietaryMatch;
  });

  let sortedPantries = [...filteredPantries];

  if (topFilter === "Top 20") {
    sortedPantries = sortedPantries
      .sort((a, b) => b.topFoods.length - a.topFoods.length)
      .slice(0, 20);
  }

  if (topFilter === "Bottom 20") {
    sortedPantries = sortedPantries
      .sort((a, b) => a.topFoods.length - b.topFoods.length)
      .slice(0, 20);
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
              onChange={(e) => setSelectedBorough(e.target.value)}
            >
              {boroughs.map((b, i) => (
                <option key={i}>{b}</option>
              ))}
            </select>

            <label>Dietary Filter</label>
            <select
              value={dietaryFilter}
              onChange={(e) => setDietaryFilter(e.target.value)}
            >
              {dietaryOptions.map((d, i) => (
                <option key={i}>{d}</option>
              ))}
            </select>

            <label>Top Results</label>
            <select
              value={topFilter}
              onChange={(e) => setTopFilter(e.target.value)}
            >
              <option>All</option>
              <option>Top 20</option>
              <option>Bottom 20</option>
            </select>
          </div>

          {/* Food Availability Stats */}
          <div className="summary-card">
            <h3>Food Availability by Type</h3>
            <ul>
              <li>Fresh Produce → {((dietaryStats.freshProduce / totalImages) * 100).toFixed(1)}% ({dietaryStats.freshProduce} pantries)</li>
              <li>Protein/Meat → {((dietaryStats.meat / totalImages) * 100).toFixed(1)}% ({dietaryStats.meat} pantries)</li>
              <li>Dairy → {((dietaryStats.dairy / totalImages) * 100).toFixed(1)}% ({dietaryStats.dairy} pantries)</li>
              <li>Grains → {((dietaryStats.grains / totalImages) * 100).toFixed(1)}% ({dietaryStats.grains} pantries)</li>
              <li>Halal Options → {((dietaryStats.halal / totalImages) * 100).toFixed(1)}% ({dietaryStats.halal} pantries)</li>
              <li>Kosher Options → {((dietaryStats.kosher / totalImages) * 100).toFixed(1)}% ({dietaryStats.kosher} pantries)</li>
            </ul>
          </div>

          {/* Shortage Analytics */}
          <div className="summary-card">
            <h3>Top Food Shortages</h3>
            {shortages.length === 0 ? (
              <p>No shortage data available (backend not connected)</p>
            ) : (
              <ul>
                {shortages.slice(0, 5).map((s, i) => (
                  <li key={i}>
                    {s.item} — shortage score {s.shortage_score}
                  </li>
                ))}
              </ul>
            )}
          </div>

          <h2>Pantries ({sortedPantries.length})</h2>

          <div className="pantry-grid">
            {sortedPantries.map((pantry, index) => (
              <div key={index} className="pantry-card">
                <h3>{pantry.pantry}</h3>
                <p style={{ fontWeight: "bold" }}>
                  Borough: {pantry.neighborhood}
                </p>

                {/* Dietary badges */}
                <div className="dietary-badges">
                  {pantry.flags?.hasHalal && <span className="badge halal">Halal</span>}
                  {pantry.flags?.hasKosher && <span className="badge kosher">Kosher</span>}
                  {pantry.flags?.hasFreshProduce && <span className="badge fresh">Fresh Produce</span>}
                </div>

                <p style={{ fontWeight: "bold", marginTop: "10px" }}>
                  Top Foods Detected
                </p>
                <ul>
                  {pantry.topFoods.map(([food, count], i) => (
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
