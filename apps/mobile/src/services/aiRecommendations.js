import { API_ENABLED, API_ORIGIN } from './api';

const TIMEOUT_MS = 25000;

// One chat turn: the new prompt plus earlier turns, so follow-ups like "cheaper ones" make sense.
// Resolves to { reply, title, recommendations: [{ dishId, reason }], suggestions }.
export async function requestAIChat({ prompt, history = [], menu }) {
  if (!API_ENABLED) throw new Error('FoodMind AI is unavailable.');
  const controller = typeof AbortController === 'function' ? new AbortController() : null;
  const timer = controller ? setTimeout(() => controller.abort(), TIMEOUT_MS) : null;
  try {
    const response = await fetch(`${API_ORIGIN}/api/ai/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ prompt, history, menu }),
      signal: controller?.signal,
    });
    const body = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(body.error || 'FoodMind AI is unavailable.');
    return {
      reply: typeof body.reply === 'string' ? body.reply : '',
      title: typeof body.title === 'string' ? body.title : '',
      recommendations: Array.isArray(body.recommendations) ? body.recommendations : [],
      suggestions: Array.isArray(body.suggestions) ? body.suggestions : [],
    };
  } finally {
    if (timer) clearTimeout(timer);
  }
}

export async function requestAIRecommendations({ prompt, preferences, menu }) {
  if (!API_ENABLED) throw new Error('FoodMind AI is unavailable.');
  const response = await fetch(`${API_ORIGIN}/api/ai/recommendations`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ prompt, preferences, menu }),
  });
  const body = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(body.error || 'FoodMind AI is unavailable.');
  return Array.isArray(body.recommendations) ? body.recommendations : [];
}
