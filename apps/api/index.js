const http = require('http');

const PORT = Number(process.env.PORT || 3001);
const MODEL = process.env.GEMINI_MODEL || 'gemini-3.5-flash';
const GEMINI_URL = `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent`;

const MAX_PROMPT = 500;
const MAX_HISTORY = 12;
const MAX_RECOMMENDATIONS = 8;
const MAX_SUGGESTIONS = 3;

// What Gemini must return for every chat turn.
const responseSchema = {
  type: 'OBJECT',
  properties: {
    reply: { type: 'STRING' },
    title: { type: 'STRING' },
    recommendations: {
      type: 'ARRAY',
      items: {
        type: 'OBJECT',
        properties: { dishId: { type: 'STRING' }, reason: { type: 'STRING' } },
        required: ['dishId', 'reason'],
      },
    },
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

function sendJson(res, statusCode, data) {
  res.writeHead(statusCode, {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
  });
  res.end(JSON.stringify(data));
}

function readRequestBody(req) {
  return new Promise((resolve, reject) => {
    let body = '';
    req.on('data', chunk => {
      body += chunk;
      if (body.length > 1_000_000) {
        reject(new Error('Request body is too large.'));
        req.destroy();
      }
    });
    req.on('end', () => {
      try {
        resolve(JSON.parse(body || '{}'));
      } catch {
        reject(new Error('Invalid request JSON.'));
      }
    });
    req.on('error', reject);
  });
}

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
  const validIds = new Set(slimMenu(menu).map(dish => dish.id));
  const seen = new Set();
  const recommendations = (Array.isArray(parsed?.recommendations) ? parsed.recommendations : [])
    .filter(item => {
      const id = item?.dishId != null ? String(item.dishId) : '';
      if (!validIds.has(id) || seen.has(id)) return false;
      seen.add(id);
      return true;
    })
    .slice(0, MAX_RECOMMENDATIONS)
    .map(item => ({ dishId: String(item.dishId), reason: text(item.reason, 300) }));
  const suggestions = (Array.isArray(parsed?.suggestions) ? parsed.suggestions : [])
    .map(value => text(value, 60)).filter(Boolean).slice(0, MAX_SUGGESTIONS);
  const reply = text(parsed?.reply, 600).replace(/\s*\n+\s*/g, ' ')
    || (recommendations.length ? 'Here is what I found on the menu.' : "I couldn't find a dish on the menu for that.");
  return { reply, title: recommendations.length ? text(parsed?.title, 80) : '', recommendations, suggestions };
}

async function getChatReply({ menu, prompt, history }, { apiKey = process.env.GEMINI_API_KEY, fetchImpl = fetch } = {}) {
  if (!apiKey) throw new Error('GEMINI_API_KEY is missing. Add it to apps/api/.env or set it in the environment.');

  const response = await fetchImpl(GEMINI_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-goog-api-key': apiKey },
    body: JSON.stringify(buildGeminiRequest({ menu, prompt, history })),
  });
  const payload = await response.json();
  if (!response.ok) {
    console.error('Gemini API error:', JSON.stringify(payload, null, 2));
    throw new Error(payload?.error?.message || `Gemini API returned ${response.status}`);
  }

  // Exclude thinking parts and keep only the final answer.
  const content = (payload?.candidates?.[0]?.content?.parts || [])
    .filter(part => typeof part.text === 'string' && !part.thought)
    .map(part => part.text).join('').trim();
  if (!content) {
    console.error('Gemini response:', JSON.stringify(payload, null, 2));
    throw new Error('Gemini returned an empty response.');
  }
  try {
    return cleanResult(JSON.parse(content), menu);
  } catch (error) {
    console.error('Gemini raw response:', content);
    throw new Error('Gemini returned invalid JSON.');
  }
}

const CHAT_ROUTES = new Set(['/api/ai/chat', '/api/ai/recommendations']);

function createServer(options = {}) {
  return http.createServer(async (req, res) => {
    if (req.method === 'OPTIONS') {
      res.writeHead(204, {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type',
      });
      return res.end();
    }
    if (req.method === 'GET' && req.url === '/') {
      return sendJson(res, 200, { message: 'FoodMind AI server is running.', model: MODEL });
    }
    if (req.method !== 'POST' || !CHAT_ROUTES.has(req.url)) {
      return sendJson(res, 404, { error: 'Route not found.' });
    }

    try {
      const body = await readRequestBody(req);
      const prompt = text(body.prompt, MAX_PROMPT);
      if (!Array.isArray(body.menu)) return sendJson(res, 400, { error: 'A valid menu array is required.' });
      if (!prompt) return sendJson(res, 400, { error: 'A prompt is required.' });
      const result = await getChatReply({ menu: body.menu, prompt, history: body.history }, options);
      return sendJson(res, 200, result);
    } catch (error) {
      console.error('AI chat error:', error.message);
      return sendJson(res, 502, { error: 'Unable to generate AI recommendations.' });
    }
  });
}

module.exports = { buildGeminiRequest, cleanResult, createServer, getChatReply, normalizeHistory };

if (require.main === module) {
  createServer().listen(PORT, () => {
    console.log(`FoodMind AI server listening on port ${PORT} (model: ${MODEL})`);
  });
}
