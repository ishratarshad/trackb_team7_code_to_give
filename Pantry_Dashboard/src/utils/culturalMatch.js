export function calculateCulturalMatch(pantryFoods, culturalFoods) {

  if (!culturalFoods || culturalFoods.length === 0) return 0;

  const matches = culturalFoods.filter(food =>
    pantryFoods.includes(food)
  );

  return Math.round((matches.length / culturalFoods.length) * 100);
}
