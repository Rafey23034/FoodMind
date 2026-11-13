import foodData from './foodmind.json';
import { formatNumber } from '../utils/format';

// One restaurant owns its items. This is the starting menu from JSON.
export const restaurant = foodData.restaurant;
export const pricing = foodData.pricing;
export const aiPreview = foodData.aiPreview;
export const dishes = restaurant.items;

export function findDish(id, items = dishes) {
  return items.find(item => item.id === id);
}

// Every price in the app goes through here: "Rs. 1,250" (no dependency on device locale support).
export function formatPrice(value) {
  return 'Rs. ' + formatNumber(value);
}

export function makeCartItem(dish, quantity = 1, extraChicken = false) {
  const extra = extraChicken && dish.tags.includes('chicken');
  return {
    id: dish.id + (extra ? '-extra' : ''),
    dishId: dish.id,
    restaurantId: restaurant.id,
    restaurant: restaurant.name,
    name: dish.name,
    subtitle: extra ? 'Extra Chicken' : dish.category,
    option: extra ? 'Extra Chicken' : 'Regular',
    price: dish.price + (extra ? pricing.extraChicken : 0),
    rating: dish.rating,
    symbol: dish.symbol,
    quantity: Math.max(1, Number(quantity) || 1),
  };
}

// Older carts may contain only an id. New cart entries already have dish details.
export function normalizeCart(items) {
  if (!Array.isArray(items)) return [];

  const result = [];
  for (const item of items) {
    if (!item || !item.id) continue;

    if (item.name && typeof item.price === 'number') {
      result.push({ ...item, quantity: Math.max(1, Number(item.quantity) || 1) });
    } else {
      const id = item.dishId || String(item.id).replace(/-extra$/, '');
      const dish = findDish(id);
      if (dish) {
        const extraChicken = String(item.id).endsWith('-extra');
        result.push(makeCartItem(dish, item.quantity, extraChicken));
      }
    }
  }
  return result;
}

// New partner dishes have no rating yet; show "New" instead of a made-up number.
export function ratingLabel(dish) {
  return dish?.rating ? String(dish.rating) : 'New';
}
