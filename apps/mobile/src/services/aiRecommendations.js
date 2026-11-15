const API_BASE_URL = (process.env.EXPO_PUBLIC_API_URL || 'http://10.0.2.2:3001').replace(/\/$/, '');
const TIMEOUT_MS = 25000;

// One chat turn: the new prompt plus earlier turns, so follow-ups like "cheaper ones" make sense.
// Resolves to { reply, title, recommendations: [{ dishId, reason }], suggestions }.
export async function requestAIChat({ prompt, history = [], menu }) {
  const controller = typeof AbortController === 'function' ? new AbortController() : null;
  const timer = controller ? setTimeout(() => controller.abort(), TIMEOUT_MS) : null;
  try {
    const response = await fetch(`${API_BASE_URL}/api/ai/chat`, {
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
