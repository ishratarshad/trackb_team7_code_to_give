import { useState, useEffect } from "react";
import {
  getFoodPreferencesByZipCode,
  calculateCulturalMatchScore
} from "./lib/demographicsApi";

import classifierData from "./data/classifierOutput.json";
import CulturalMatchCard from "./components/CulturalMatchCard";
import "./App.css";

function App() {

  const [demographicFoods, setDemographicFoods] = useState({});

  const images = classifierData.results || [];

  const totalImages = images.length;

  useEffect(() => {

    async function loadDemographics() {

      try {

        const prefs = await getFoodPreferencesByZipCode("10001");

        setDemographicFoods({
          "10001": prefs.foods || []
        });

      } catch (error) {

        console.error("Demographics API failed:", error);

      }

    }

    loadDemographics();

  }, []);

  function normalizeFood(food) {

    const item = food.toLowerCase();

    if (item.includes("rice")) return "rice";
    if (item.includes("bean")) return "beans";
    if (item.includes("lentil")) return "lentils";
    if (item.includes("chickpea")) return "chickpeas";
    if (item.includes("banana")) return "banana";
    if (item.includes("pasta")) return "pasta";
    if (item.includes("bread")) return "bread";
    if (item.includes("apple")) return "apple";
    if (item.includes("milk")) return "milk";

    return item;

  }

  function extractNeighborhood(pantryName) {

    const match = pantryName.match(/\((.*?)\)/);

    return match ? match[1] : "Unknown";

  }

  const pantryMap = {};

  images.forEach(img => {

    const pantry = img.source?.resourceName || "Unknown Pantry";
    const neighborhood = img.source?.neighborhoodName || "Unknown Area";

    const key = `${pantry} (${neighborhood})`;

    if (!pantryMap[key]) {
      pantryMap[key] = [];
    }

    img.rawTags.forEach(tag => {
      pantryMap[key].push(tag.label);
    });

  });

  const pantryResults = Object.entries(pantryMap).map(([pantry, foods]) => {

    const normalizedFoods = foods.map(normalizeFood);
    const uniqueFoods = [...new Set(normalizedFoods)];

    const zipCode = "10001";

    const culturalFoods = demographicFoods[zipCode] || [];

    const score = culturalFoods.length
      ? calculateCulturalMatchScore(uniqueFoods, culturalFoods)
      : 0;

    const missing = culturalFoods.filter(
      food => !uniqueFoods.includes(food)
    );

    const foodCounts = {};

    normalizedFoods.forEach(food => {
      foodCounts[food] = (foodCounts[food] || 0) + 1;
    });

    const topFoods = Object.entries(foodCounts)
      .sort((a,b) => b[1] - a[1])
      .slice(0,3);

    return {
      pantry,
      score,
      missing,
      topFoods
    };

  });

  const neighborhoodScores = {};

  pantryResults.forEach((p) => {

    const neighborhood = extractNeighborhood(p.pantry);

    if (!neighborhoodScores[neighborhood]) {

      neighborhoodScores[neighborhood] = {
        totalScore: 0,
        count: 0
      };

    }

    neighborhoodScores[neighborhood].totalScore += p.score;
    neighborhoodScores[neighborhood].count += 1;

  });

  const neighborhoodAverages = Object.entries(neighborhoodScores).map(
    ([name, data]) => ({

      name,

      avgScore: data.count
        ? data.totalScore / data.count
        : 0

    })
  );

  neighborhoodAverages.sort((a,b)=> a.avgScore - b.avgScore);

  return (

    <div className="dashboard">

      <h1>NYC Pantry Dashboard</h1>
      <p className="subtitle">Cultural Food Match Analysis</p>

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

      <div className="pantry-card">

        <h3>Neighborhood Cultural Food Access</h3>

        <ul>

          {neighborhoodAverages.slice(0,10).map((n, i) => (

            <li key={i}>
              {n.name} — {n.avgScore.toFixed(1)}%
            </li>

          ))}

        </ul>

      </div>

      <div className="pantry-grid">

        {pantryResults.map((pantry, index) => (

          <div key={index} className="pantry-card">

            <h3>{pantry.pantry}</h3>

            <CulturalMatchCard score={pantry.score} />

            <p style={{ fontWeight: "bold", marginTop: "10px" }}>
              Missing culturally relevant foods:
            </p>

            <ul>

              {pantry.missing.map((food, i) => (
                <li key={i}>{food}</li>
              ))}

            </ul>

            <p style={{ fontWeight: "bold", marginTop: "10px" }}>
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

    </div>

  );

}

export default App;
