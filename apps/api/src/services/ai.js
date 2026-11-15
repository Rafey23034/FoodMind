const { HttpError } = require('../errors');
const { generateJson, recommendationSchema, validRecommendations } = require('./gemini');

const responseSchema = {
  type: 'OBJECT',
  properties: {
    recommendations: recommendationSchema,
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

async function recommendations(menu, preferences = {}, options) {
  if (!Array.isArray(menu)) throw new HttpError(400, 'A valid menu array is required.');

  const userMessage = `
USER PREFERENCES:
${JSON.stringify(preferences || {}, null, 2)}

AVAILABLE MENU:
${JSON.stringify(menu, null, 2)}

Recommend the most suitable dishes for this user.
`;

  const parsed = await generateJson({
    systemInstruction: { parts: [{ text: instruction }] },
    contents: [{ role: 'user', parts: [{ text: userMessage }] }],
    generationConfig: { responseMimeType: 'application/json', responseSchema, maxOutputTokens: 1000 },
  }, options);
  const cleaned = validRecommendations(parsed?.recommendations, menu, 5, true)
    .map(item => ({ dishId: String(item.dishId), reason: String(item.reason) }));

  return { recommendations: cleaned };
}

module.exports = { recommendations };
