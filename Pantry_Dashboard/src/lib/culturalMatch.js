export function calculateCultureScore(pantryFoods, culturalFoods) {

  if (!culturalFoods.length) return 0;

  let matches = 0;

  culturalFoods.forEach(food => {
    if (pantryFoods.includes(food)) {
      matches++;
    }
  });

  return (matches / culturalFoods.length) * 100;
}
