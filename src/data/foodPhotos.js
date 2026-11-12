// Metro needs literal require() paths; foodmind.json chooses the filenames.
export const foodPhotos = {
  'Creamy_Chicken_Pasta.png': require('../assets/images/Creamy_Chicken_Pasta.png'),
  'Creamy_Fettuccine_Alfredo_Pasta.png': require('../assets/images/Creamy_Fettuccine_Alfredo_Pasta.png'),
  'Fire_Burger.png': require('../assets/images/Fire_Burger.png'),
  'Classic_Smash_Burger.png': require('../assets/images/Classic_Smash_Burger.png'),
  'Juicy_Smash_Double_Cheeseburger.png': require('../assets/images/Juicy_Smash_Double_Cheeseburger.png'),
  'Loaded_Fries.png': require('../assets/images/Loaded_Fries.png'),
  'Chicken_Wrap.png': require('../assets/images/Chicken_Wrap.png'),
  'Pepperoni_Pizza.png': require('../assets/images/Pepperoni_Pizza.png'),
  'Loaded_Fries_and_Burger.png': require('../assets/images/Loaded_Fries_and_Burger.png'),
};

export function getFoodPhoto(dish, { featured = false } = {}) {
  if (dish?.photoUri) return { uri: dish.photoUri };
  return foodPhotos[featured ? dish?.featuredImage || dish?.image : dish?.image];
}
