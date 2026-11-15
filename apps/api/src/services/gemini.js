const config = require('../config');
const { HttpError } = require('../errors');

const recommendationSchema = {
  type: 'ARRAY',
  items: {
    type: 'OBJECT',
    properties: { dishId: { type: 'STRING' }, reason: { type: 'STRING' } },
    required: ['dishId', 'reason'],
  },
};

async function generateJson(request, { apiKey = config.gemini.apiKey, fetchImpl = fetch } = {}) {
  if (!apiKey) throw new HttpError(502, 'GEMINI_API_KEY is missing. Add it to apps/api/.env.');

  const response = await fetchImpl(
    `https://generativelanguage.googleapis.com/v1beta/models/${config.gemini.model}:generateContent`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-goog-api-key': apiKey },
      body: JSON.stringify(request),
    }
  );
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) throw new HttpError(502, payload?.error?.message || `Gemini API returned ${response.status}.`);

  const content = (payload?.candidates?.[0]?.content?.parts || [])
    .filter(part => typeof part.text === 'string' && !part.thought)
    .map(part => part.text).join('').trim();
  if (!content) throw new HttpError(502, 'Gemini returned an empty response.');

  try {
    return JSON.parse(content);
  } catch {
    throw new HttpError(502, 'Gemini returned invalid JSON.');
  }
}

// Keep operation-specific reason formatting in the calling service.
function validRecommendations(items, menu, limit) {
  const validIds = new Set(menu
    .filter(dish => dish && (dish.id ?? dish.dishId) != null)
    .map(dish => String(dish.id ?? dish.dishId)));
  const seen = new Set();
  return (Array.isArray(items) ? items : []).filter(item => {
    if (item?.dishId == null) return false;
    const id = String(item.dishId);
    if (!validIds.has(id) || seen.has(id)) return false;
    seen.add(id);
    return true;
  }).slice(0, limit);
}

module.exports = { generateJson, recommendationSchema, validRecommendations };
