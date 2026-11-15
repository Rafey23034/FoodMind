import { API_ENABLED, API_ORIGIN } from './api';

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
