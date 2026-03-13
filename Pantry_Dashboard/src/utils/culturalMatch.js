export function calculateCulturalMatch(foodTags, demographicFoods) {
  let matches = 0;

  foodTags.forEach(food => {
    if (demographicFoods.includes(food)) {
      matches++;
    }
  });

  return Math.round((matches / foodTags.length) * 100);
}