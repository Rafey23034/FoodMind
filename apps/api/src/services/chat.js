const { generateJson, recommendationSchema, validRecommendations } = require('./gemini');

const MAX_HISTORY = 12;
const MAX_RECOMMENDATIONS = 8;
const MAX_SUGGESTIONS = 3;

// What Gemini must return for every chat turn.
const responseSchema = {
  type: 'OBJECT',
  properties: {
    reply: { type: 'STRING' },
    title: { type: 'STRING' },
    recommendations: recommendationSchema,
    suggestions: { type: 'ARRAY', items: { type: 'STRING' } },
  },
  required: ['reply', 'recommendations'],
};

const INSTRUCTION = `
You are FoodMind, a friendly food-ordering assistant inside a food delivery app.
You are in a conversation: the customer may refine earlier requests ("cheaper", "something spicy instead",
"what about burgers?"). Use the earlier turns to understand what they mean.

Rules:
1. Recommend only dishes from the MENU below, using their exact "id" as dishId.
2. Never invent dishes, ingredients, prices, discounts or delivery times.
3. Respect budgets, dietary needs and every other constraint, including ones from earlier turns
   that the customer has not dropped.
4. "reply": one or two short, warm sentences answering the customer. No lists, no line breaks.
5. "title": a short heading for the results, for example "Pasta under Rs. 1,000". Empty if no results.
6. "recommendations": up to ${MAX_RECOMMENDATIONS} dishes, best first, each with a short reason.
   Return an empty array when nothing fits, or when the message is not a food request (then just reply).
7. "suggestions": up to ${MAX_SUGGESTIONS} short follow-up requests the customer could tap next,
   written as the customer would say them, for example "Something spicier" or "Under Rs. 800".
8. Write prices as "Rs. 1,000".
`;

const text = (value, max) => (typeof value === 'string' ? value.trim().slice(0, max) : '');

// Only the fields the model needs, so every turn stays small.
function slimMenu(menu) {
  return menu
    .filter(dish => dish && (dish.id ?? dish.dishId) != null)
    .map(dish => ({
      id: String(dish.id ?? dish.dishId),
      name: text(dish.name, 120),
      category: text(dish.category, 60),
      price: Number(dish.price) || 0,
      rating: Number(dish.rating) || null,
      description: text(dish.description, 300),
      tags: Array.isArray(dish.tags) ? dish.tags.map(tag => text(tag, 40)).filter(Boolean) : [],
    }));
}

// Earlier turns from the app: [{ role: 'user' | 'assistant', text, dishIds? }]. Oldest first.
function normalizeHistory(history) {
  if (!Array.isArray(history)) return [];
  return history
    .filter(turn => turn && (turn.role === 'user' || turn.role === 'assistant'))
    .map(turn => ({
      role: turn.role,
      text: text(turn.text, 1000),
      dishIds: Array.isArray(turn.dishIds) ? turn.dishIds.map(String).slice(0, MAX_RECOMMENDATIONS) : [],
    }))
    .filter(turn => turn.text || turn.dishIds.length)
    .slice(-MAX_HISTORY);
}

// Earlier assistant turns are replayed in the same JSON shape the model produces,
// so a follow-up like "cheaper ones" knows which dishes were shown.
function buildGeminiRequest({ menu, prompt, history }) {
  const contents = normalizeHistory(history).map(turn => turn.role === 'user'
    ? { role: 'user', parts: [{ text: turn.text }] }
    : { role: 'model', parts: [{ text: JSON.stringify({ reply: turn.text, recommendations: turn.dishIds.map(dishId => ({ dishId })) }) }] });
  contents.push({ role: 'user', parts: [{ text: prompt }] });
  return {
    systemInstruction: { parts: [{ text: `${INSTRUCTION}\nMENU:\n${JSON.stringify(slimMenu(menu))}` }] },
    contents,
    generationConfig: { responseMimeType: 'application/json', responseSchema, maxOutputTokens: 2048 },
  };
}

// Keeps only real, unique menu dishes and tidy strings, whatever the model returned.
function cleanResult(parsed, menu) {
  const recommendations = validRecommendations(parsed?.recommendations, menu, MAX_RECOMMENDATIONS)
    .map(item => ({ dishId: String(item.dishId), reason: text(item.reason, 300) }));
  const suggestions = (Array.isArray(parsed?.suggestions) ? parsed.suggestions : [])
    .map(value => text(value, 60)).filter(Boolean).slice(0, MAX_SUGGESTIONS);
  const reply = text(parsed?.reply, 600).replace(/\s*\n+\s*/g, ' ')
    || (recommendations.length ? 'Here is what I found on the menu.' : "I couldn't find a dish on the menu for that.");
  return { reply, title: recommendations.length ? text(parsed?.title, 80) : '', recommendations, suggestions };
}

async function getChatReply({ menu, prompt, history }, options) {
  const parsed = await generateJson(buildGeminiRequest({ menu, prompt, history }), options);
  return cleanResult(parsed, menu);
}

module.exports = { buildGeminiRequest, cleanResult, getChatReply };
