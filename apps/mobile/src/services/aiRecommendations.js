const API_BASE_URL = (process.env.EXPO_PUBLIC_API_URL || 'http://10.0.2.2:3001').replace(/\/$/, '');

export async function requestAIRecommendations({ prompt, preferences, menu }) {
  const response = await fetch(`${API_BASE_URL}/api/ai/recommendations`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ prompt, preferences, menu }),
  });
  const body = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(body.error || 'FoodMind AI is unavailable.');
  return Array.isArray(body.recommendations) ? body.recommendations : [];
}
