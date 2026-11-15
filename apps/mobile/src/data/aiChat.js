import { FOOD_TERMS, matchDishes, restaurantMeetsTime } from './discovery';
import { formatPrice, restaurant } from './catalog';

// Prompts offered on the empty chat. Each one returns real matches from the starting menu.
export const CHAT_STARTERS = [
  { emoji: '🍝', text: 'Creamy chicken pasta under Rs. 1,200' },
  { emoji: '🔥', text: 'Spicy midnight comfort food' },
  { emoji: '🌶️', text: 'Spicy chicken under Rs. 900' },
  { emoji: '🥘', text: 'Authentic biryani nearby' },
];

// Follow-ups the offline matcher understands, offered when the AI service is unreachable.
export const LOCAL_SUGGESTIONS = ['Cheaper options', 'Burgers under Rs. 900', 'Vegetarian options', 'Desi food under Rs. 1,000', 'Creamy pasta'];

const GREETING = /^(hi|hello|hey|salam|assalam|aoa|thanks|thank you)\b/i;
const CHEAPER = /\b(cheaper|less expensive|lower price|budget options?)\b/i;
const FAST = /under\s*(?:30|20|15)\s*min/i;

// Chat messages in the shape the API expects for earlier turns.
export function historyForServer(messages) {
  return messages
    .filter(message => message.role === 'user' || (message.role === 'assistant' && message.status === 'done'))
    .map(message => message.role === 'user'
      ? { role: 'user', text: message.text }
      : { role: 'assistant', text: message.reply || '', dishIds: (message.recommendations || []).map(item => item.dishId) });
}

const foodWords = text => FOOD_TERMS.filter(word => String(text).toLowerCase().includes(word));

// The offline matcher reads one prompt at a time, so follow-ups borrow what the customer
// already asked for: "under 800" after "pasta" becomes "pasta under 800".
export function contextualPrompt(prompt, history = [], menu = []) {
  let result = prompt.trim();
  const lastUser = [...history].reverse().find(turn => turn.role === 'user' && foodWords(turn.text).length);
  const lastShown = [...history].reverse().find(turn => turn.role === 'assistant' && turn.dishIds?.length);
  if (CHEAPER.test(result) && lastShown) {
    const prices = lastShown.dishIds.map(id => menu.find(dish => dish.id === id)?.price).filter(Number.isFinite);
    const words = lastUser ? foodWords(lastUser.text).join(' ') : '';
    if (prices.length) return `${words} under ${Math.max(...prices) - 1}`.trim();
  }
  if (!foodWords(result).length && lastUser) result = `${foodWords(lastUser.text).join(' ')} ${result}`;
  return result;
}

const capitalize = text => text.charAt(0).toUpperCase() + text.slice(1);

// Deterministic reply used when the AI service cannot be reached.
export function localChatReply(menu, prompt, history = []) {
  const sent = new Set(history.filter(turn => turn.role === 'user').map(turn => turn.text.toLowerCase()));
  sent.add(prompt.toLowerCase());
  const unused = LOCAL_SUGGESTIONS.filter(text => text !== 'Cheaper options' && !sent.has(text.toLowerCase()));
  // "Cheaper options" only makes sense once dishes are on screen, and can be repeated.
  const suggestions = unused.slice(0, 3);
  if (GREETING.test(prompt.trim()) && !foodWords(prompt).length) {
    return { reply: 'Hi! Tell me what you are craving: a dish, a budget or a mood.', title: '', recommendations: [], suggestions };
  }
  const query = contextualPrompt(prompt, history, menu);
  if (FAST.test(query) && !restaurantMeetsTime(restaurant.time, 30)) {
    return { reply: `${restaurant.name} delivers in ${restaurant.time}, so nothing on the menu arrives in under 30 minutes.`, title: '', recommendations: [], suggestions };
  }
  const matches = matchDishes(menu, query).slice(0, 8);
  if (!matches.length) {
    return { reply: `I couldn't find anything on the menu for "${prompt.trim()}". Try another dish or a higher budget.`, title: '', recommendations: [], suggestions };
  }
  const cheapest = Math.min(...matches.map(dish => dish.price));
  return {
    reply: `I found ${matches.length} ${matches.length === 1 ? 'dish' : 'dishes'} on the menu for that, starting at ${formatPrice(cheapest)}.`,
    title: capitalize(query.replace(/\s+/g, ' ')).slice(0, 48),
    recommendations: matches.map(dish => ({ dishId: dish.id, reason: dish.tags.join(' · ') })),
    suggestions: ['Cheaper options', ...unused].slice(0, 3),
  };
}
