
const http = require('http');

const PORT = Number(process.env.PORT || 3001);
const MODEL = process.env.GEMINI_MODEL || 'gemini-3.5-flash';

const GEMINI_URL =
  `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent`;

const responseSchema = {
  type: 'OBJECT',
  properties: {
    recommendations: {
      type: 'ARRAY',
      items: {
        type: 'OBJECT',
        properties: {
          dishId: {
            type: 'STRING',
          },
          reason: {
            type: 'STRING',
          },
        },
        required: ['dishId', 'reason'],
      },
    },
  },
  required: ['recommendations'],
};

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

async function getRecommendations(menu, preferences) {
  const apiKey = process.env.GEMINI_API_KEY;

  if (!apiKey) {
    throw new Error('GEMINI_API_KEY is missing. Add it to apps/api/.env or set it in the environment.');
  }

  const instruction = `
You are FoodMind, an AI food recommendation assistant.

Your job is to recommend suitable dishes from the menu provided.

Rules:
1. Recommend only dishes that exist in the provided menu.
2. Use the exact dishId from the menu.
3. Consider the user's preferences, dietary requirements, budget,
   and other relevant information.
4. Never invent menu items, ingredients, prices, or details.
5. Give a short, useful reason for every recommendation.
6. Return up to 5 recommendations.
7. If no dish is suitable, return an empty recommendations array.
8. Return only the JSON object matching the required schema.
`;

  const userMessage = `
USER PREFERENCES:
${JSON.stringify(preferences || {}, null, 2)}

AVAILABLE MENU:
${JSON.stringify(menu, null, 2)}

Recommend the most suitable dishes for this user.
`;

  const response = await fetch(GEMINI_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-goog-api-key': apiKey,
    },
    body: JSON.stringify({
      systemInstruction: {
        parts: [{ text: instruction }],
      },
      contents: [
        {
          role: 'user',
          parts: [{ text: userMessage }],
        },
      ],
      generationConfig: {
        responseMimeType: 'application/json',
        responseSchema,
        maxOutputTokens: 1000,
      },
    }),
  });

  const payload = await response.json();

  if (!response.ok) {
    console.error('Gemini API error:', JSON.stringify(payload, null, 2));

    throw new Error(
      payload?.error?.message || `Gemini API returned ${response.status}`
    );
  }

  const candidate = payload?.candidates?.[0];
  const parts = candidate?.content?.parts || [];

  // Exclude thinking parts and collect only the final response.
  const content = parts
    .filter(part =>
      typeof part.text === 'string' && !part.thought
    )
    .map(part => part.text)
    .join('')
    .trim();

  if (!content) {
    console.error(
      'Gemini response:',
      JSON.stringify(payload, null, 2)
    );

    throw new Error('Gemini returned an empty response.');
  }

  let parsed;

  try {
    parsed = JSON.parse(content);
  } catch (error) {
    console.error('Gemini raw response:', content);
    console.error('JSON parsing error:', error.message);

    throw new Error('Gemini returned invalid JSON.');
  }

  const validDishIds = new Set(
    (Array.isArray(menu) ? menu : [])
      .map(dish => String(dish.id ?? dish.dishId))
  );

  const recommendations = Array.isArray(parsed.recommendations)
    ? parsed.recommendations
    : [];

  const seen = new Set();

  const cleanedRecommendations = recommendations
    .filter(item => {
      if (!item || !item.dishId || !item.reason) {
        return false;
      }

      const dishId = String(item.dishId);

      if (!validDishIds.has(dishId) || seen.has(dishId)) {
        return false;
      }

      seen.add(dishId);
      return true;
    })
    .slice(0, 5)
    .map(item => ({
      dishId: String(item.dishId),
      reason: String(item.reason),
    }));

  return {
    recommendations: cleanedRecommendations,
  };
}

const server = http.createServer(async (req, res) => {
  if (req.method === 'OPTIONS') {
    res.writeHead(204, {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    });

    return res.end();
  }

  if (req.method === 'GET' && req.url === '/') {
    return sendJson(res, 200, {
      message: 'FoodMind AI server is running.',
      model: MODEL,
    });
  }

  if (req.method !== 'POST' || req.url !== '/api/ai/recommendations') {
    return sendJson(res, 404, {
      error: 'Route not found.',
    });
  }

  try {
    const body = await readRequestBody(req);

    const menu = body.menu;
    const preferences = body.preferences || {};

    if (!Array.isArray(menu)) {
      return sendJson(res, 400, {
        error: 'A valid menu array is required.',
      });
    }

    const result = await getRecommendations(menu, preferences);

    return sendJson(res, 200, result);
  } catch (error) {
    console.error('AI recommendation error:', error.message);

    return sendJson(res, 502, {
      error: 'Unable to generate AI recommendations.',
      details: error.message,
    });
  }
});

server.listen(PORT, () => {
  console.log(
    `FoodMind AI server listening on port ${PORT} (model: ${MODEL})`
  );
});
