const config = require('../config');
const { HttpError } = require('../errors');

const responseSchema = {
  type: 'OBJECT',
  properties: {
    recommendations: {
      type: 'ARRAY',
      items: {
        type: 'OBJECT',
        properties: {
          dishId: { type: 'STRING' },
          reason: { type: 'STRING' },
        },
        required: ['dishId', 'reason'],
      },
    },
  },
  required: ['recommendations'],
};

const instruction = `
You are FoodMind, an AI food recommendation assistant.

Your job is to recommend suitable dishes from the menu provided.

Rules:
1. Recommend only dishes that exist in the provided menu.
2. Use the exact dishId from the menu.
3. Consider the user's preferences, dietary requirements, budget, and other relevant information.
4. Never invent menu items, ingredients, prices, or details.
5. Give a short, useful reason for every recommendation.
6. Return up to 5 recommendations.
7. If no dish is suitable, return an empty recommendations array.
8. Return only the JSON object matching the required schema.
`;

async function recommendations(menu, preferences = {}) {
  if (!Array.isArray(menu)) throw new HttpError(400, 'A valid menu array is required.');
  if (!config.gemini.apiKey) {
    throw new HttpError(502, 'GEMINI_API_KEY is missing. Add it to apps/api/.env.');
  }

  const userMessage = `
USER PREFERENCES:
${JSON.stringify(preferences || {}, null, 2)}

AVAILABLE MENU:
${JSON.stringify(menu, null, 2)}

Recommend the most suitable dishes for this user.
`;

  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${config.gemini.model}:generateContent`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-goog-api-key': config.gemini.apiKey,
      },
      body: JSON.stringify({
        systemInstruction: { parts: [{ text: instruction }] },
        contents: [{ role: 'user', parts: [{ text: userMessage }] }],
        generationConfig: {
          responseMimeType: 'application/json',
          responseSchema,
          maxOutputTokens: 1000,
        },
      }),
    }
  );

  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new HttpError(502, payload?.error?.message || `Gemini API returned ${response.status}.`);
  }

  const parts = payload?.candidates?.[0]?.content?.parts || [];
  const content = parts
    .filter(part => typeof part.text === 'string' && !part.thought)
    .map(part => part.text)
    .join('')
    .trim();
  if (!content) throw new HttpError(502, 'Gemini returned an empty response.');

  let parsed;
  try {
    parsed = JSON.parse(content);
  } catch {
    throw new HttpError(502, 'Gemini returned invalid JSON.');
  }

  const validDishIds = new Set(menu.map(dish => String(dish.id ?? dish.dishId)));
  const seen = new Set();
  const cleaned = (Array.isArray(parsed.recommendations) ? parsed.recommendations : [])
    .filter(item => {
      if (!item?.dishId || !item?.reason) return false;
      const dishId = String(item.dishId);
      if (!validDishIds.has(dishId) || seen.has(dishId)) return false;
      seen.add(dishId);
      return true;
    })
    .slice(0, 5)
    .map(item => ({ dishId: String(item.dishId), reason: String(item.reason) }));

  return { recommendations: cleaned };
}

module.exports = { recommendations };
