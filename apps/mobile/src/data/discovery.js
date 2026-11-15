// Dish words the matcher treats as "must be this kind of food".
export const FOOD_TERMS = ['pasta', 'burger', 'pizza', 'biryani', 'karahi', 'wrap', 'fries', 'sushi', 'bowl', 'salad'];

// Deterministic menu matching for the frontend prototype. Replace with an API later.
export function matchDishes(items, prompt = '', preferences = []) {
  const query = prompt.toLowerCase();
  const budgetMatch = query.match(/(?:under|below|budget|less than|max)\s*(?:rs\.?\s*)?([\d,]+)\b(?!\s*min)/);
  const requestedBudget = budgetMatch ? Number(budgetMatch[1].replace(/,/g, '')) : Infinity;
  const budget = Math.min(requestedBudget, preferences.includes('budget') ? 1000 : Infinity);
  const minRating = preferences.includes('rating') || /4\.5\s*\+|highly rated/.test(query) ? 4.5 : 0;
  // Delivery time is restaurant-wide; the current demo restaurant takes 25-35 minutes.
  if (preferences.includes('fast') || /under\s*(?:30|20|15)\s*min/.test(query)) return [];
  const words = query.replace(/rs\.?/g, '').split(/[^a-z]+/).filter(word => word.length > 2);
  const stop = new Set(['find', 'food', 'some', 'under', 'below', 'budget', 'less', 'than', 'highly', 'rated', 'with', 'and', 'the', 'for', 'please', 'want', 'nearby', 'delivered', 'within', 'mins', 'minutes']);
  const terms = words.filter(word => !stop.has(word));
  const wanted = FOOD_TERMS.filter(word => query.includes(word));
  return items.filter(dish => {
    const description = `${dish.name} ${dish.category} ${dish.tags.join(' ')}`.toLowerCase();
    if (dish.price > budget || dish.rating < minRating) return false;
    if (wanted.length && !wanted.some(word => description.includes(word))) return false;
    if (/vegan/.test(query) && /chicken|beef|cheese|creamy|pepperoni|white sauce/.test(description)) return false;
    if (/vegetarian/.test(query) && /chicken|beef|pepperoni/.test(description)) return false;
    return !terms.length || terms.some(word => description.includes(word));
  }).map(dish => {
    const description = `${dish.name} ${dish.category} ${dish.tags.join(' ')}`.toLowerCase();
    const count = terms.filter(word => description.includes(word)).length;
    return { ...dish, matchScore: count * 10 + dish.rating };
  }).sort((a, b) => b.matchScore - a.matchScore || a.price - b.price);
}

// One search used by Home and the Search tab: natural-language phrases ("under Rs. 800",
// "vegetarian", "highly rated") go through the matcher; plain words are a simple text search.
const PHRASE = /under|below|budget|less than|highly rated|vegan|vegetarian|\d/;
export function searchDishes(items, query = '') {
  const term = query.trim().toLowerCase();
  if (!term) return items;
  if (PHRASE.test(term)) return matchDishes(items, term);
  return items.filter(dish => `${dish.name} ${dish.category} ${(dish.tags || []).join(' ')}`.toLowerCase().includes(term));
}

// Delivery-time filters can only be met if the restaurant's slowest estimate is within the limit.
export function restaurantMeetsTime(time, limitMinutes = 30) {
  const numbers = String(time || '').match(/\d+/g)?.map(Number) || [];
  return numbers.length > 0 && Math.max(...numbers) <= limitMinutes;
}
