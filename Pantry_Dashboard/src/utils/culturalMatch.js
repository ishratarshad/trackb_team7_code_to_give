export function calculateCulturalMatch(foodTags, demographicFoods) {
  let matches = 0;

  foodTags.forEach(food => {
    if (demographicFoods.includes(food)) {
      matches++;
    }
  });

  return Math.round((matches / foodTags.length) * 100);
}

export function getMissingFoods(pantryFoods, demographicFoods) {
  return demographicFoods.filter(food => !pantryFoods.includes(food));
}