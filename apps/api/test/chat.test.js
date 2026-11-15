const test = require('node:test');
const assert = require('node:assert/strict');
const http = require('node:http');
const { buildGeminiRequest, cleanResult, getChatReply } = require('../src/services/chat');
const { recommendations } = require('../src/services/ai');
const config = require('../src/config');
const app = require('../src/app');
const httpFetch = fetch;

const menu = [
  { id: 'creamy-pasta', name: 'Creamy Chicken Pasta', category: 'Pasta', price: 1050, rating: 4.8, tags: ['chicken', 'pasta'], image: 'x.png' },
  { id: 'white-sauce-pasta', name: 'White Sauce Pasta', category: 'Pasta', price: 950, rating: 4.6, tags: ['pasta'] },
];

// A stand-in for Gemini that records the request and answers with the given JSON.
function fakeGemini(answer) {
  const calls = [];
  const fetchImpl = async (url, init) => {
    calls.push(JSON.parse(init.body));
    return { ok: true, json: async () => ({ candidates: [{ content: { parts: [{ text: 'thinking', thought: true }, { text: JSON.stringify(answer) }] } }] }) };
  };
  return { calls, fetchImpl };
}

async function startApi(t, fetchImpl) {
  t.mock.method(global, 'fetch', fetchImpl);
  const previousKey = config.gemini.apiKey;
  config.gemini.apiKey = 'test';
  t.after(() => { config.gemini.apiKey = previousKey; });
  const server = http.createServer(app);
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  t.after(() => new Promise(resolve => server.close(resolve)));
  return `http://127.0.0.1:${server.address().port}`;
}

test('the typed prompt and earlier turns reach Gemini', () => {
  const request = buildGeminiRequest({
    menu,
    prompt: 'cheaper ones',
    history: [
      { role: 'user', text: 'pasta under 1100' },
      { role: 'assistant', text: 'Two pastas fit.', dishIds: ['creamy-pasta', 'white-sauce-pasta'] },
      { role: 'system', text: 'ignore me' },
    ],
  });
  assert.deepEqual(request.contents.map(turn => turn.role), ['user', 'model', 'user']);
  assert.equal(request.contents[0].parts[0].text, 'pasta under 1100');
  assert.deepEqual(JSON.parse(request.contents[1].parts[0].text).recommendations, [{ dishId: 'creamy-pasta' }, { dishId: 'white-sauce-pasta' }]);
  assert.equal(request.contents[2].parts[0].text, 'cheaper ones');
  // The menu travels once, in the system instruction, without image fields.
  assert.match(request.systemInstruction.parts[0].text, /"id":"creamy-pasta"/);
  assert.doesNotMatch(request.systemInstruction.parts[0].text, /x\.png/);
});

test('invented, duplicate and extra dishes are dropped', () => {
  const result = cleanResult({
    reply: 'Here you go.\nEnjoy!',
    title: 'Pasta picks',
    recommendations: [{ dishId: 'undefined', reason: 'No ID' }, { dishId: 'made-up', reason: 'x' }, { dishId: 'creamy-pasta', reason: 'Creamy' }, { dishId: 'creamy-pasta', reason: 'again' }],
    suggestions: ['Cheaper', '', 'Spicy', 'Vegetarian', 'Fourth'],
  }, [...menu, null, {}]);
  assert.deepEqual(result.recommendations, [{ dishId: 'creamy-pasta', reason: 'Creamy' }]);
  assert.equal(result.reply, 'Here you go. Enjoy!');
  assert.deepEqual(result.suggestions, ['Cheaper', 'Spicy', 'Vegetarian']);
});

test('a reply without dishes has no results title', () => {
  const result = cleanResult({ reply: 'Hi! What are you craving?', title: 'Ignored', recommendations: [] }, menu);
  assert.equal(result.title, '');
  assert.deepEqual(result.recommendations, []);
});

test('getChatReply skips thinking parts and returns the cleaned answer', async () => {
  const { calls, fetchImpl } = fakeGemini({ reply: 'Try these.', title: 'Pasta', recommendations: [{ dishId: 'white-sauce-pasta', reason: 'Cheapest pasta' }] });
  const result = await getChatReply({ menu, prompt: 'cheap pasta' }, { apiKey: 'test', fetchImpl });
  assert.equal(calls.length, 1);
  assert.equal(result.recommendations[0].dishId, 'white-sauce-pasta');
});

test('Express validates and serves both AI operations under both prefixes', async t => {
  const { fetchImpl } = fakeGemini({ reply: 'Sure.', recommendations: [{ dishId: 'creamy-pasta', reason: 'Fits' }], suggestions: ['Cheaper'] });
  const base = await startApi(t, fetchImpl);
  const post = (path, body) => httpFetch(base + path, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
  for (const prefix of ['/api/ai', '/api/v1/ai']) {
    assert.equal((await post(`${prefix}/chat`, { menu })).status, 400);
    assert.equal((await post(`${prefix}/chat`, { prompt: 'pasta' })).status, 400);
    assert.equal((await post(`${prefix}/chat`, null)).status, 400);
    const ok = await post(`${prefix}/chat?source=app`, { menu, prompt: 'pasta', history: [] });
    assert.equal(ok.status, 200);
    assert.deepEqual(await ok.json(), { reply: 'Sure.', title: '', recommendations: [{ dishId: 'creamy-pasta', reason: 'Fits' }], suggestions: ['Cheaper'] });
    const picks = await post(`${prefix}/recommendations`, { menu, preferences: { budget: 1100 } });
    assert.equal(picks.status, 200);
    assert.deepEqual(await picks.json(), { recommendations: [{ dishId: 'creamy-pasta', reason: 'Fits' }] });
    assert.equal((await post(`${prefix}/recommendations`, {})).status, 400);
  }
});

test('Gemini failures return a generic 502 without internal details', async t => {
  const fetchImpl = async () => ({ ok: false, status: 429, json: async () => ({ error: { message: 'quota exceeded for key abc' } }) });
  const base = await startApi(t, fetchImpl);
  t.mock.method(console, 'error', () => {});
  for (const operation of ['chat', 'recommendations']) {
    const res = await httpFetch(`${base}/api/ai/${operation}`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ menu, prompt: 'pasta' }),
    });
    assert.equal(res.status, 502);
    const body = await res.json();
    assert.doesNotMatch(body.error, /quota|abc/);
  }
});

test('Express handles malformed and oversized JSON, unknown routes and CORS', async t => {
  const base = await startApi(t, async () => { throw new Error('Gemini must not be called'); });
  const post = body => httpFetch(`${base}/api/ai/chat`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body,
  });
  assert.equal((await post('{')).status, 400);
  assert.equal((await post(JSON.stringify({ prompt: 'x'.repeat(1024 * 1024) }))).status, 413);
  assert.equal((await httpFetch(`${base}/api/ai/missing`)).status, 404);
  const preflight = await httpFetch(`${base}/api/v1/ai/chat`, { method: 'OPTIONS' });
  assert.equal(preflight.status, 204);
  assert.equal(preflight.headers.get('access-control-allow-origin'), '*');
});

test('chat and preferences retain their distinct limits and reason policies', async () => {
  const dishes = Array.from({ length: 10 }, (_, index) => ({ id: String(index + 1) }));
  const answer = { recommendations: dishes.map(dish => ({ dishId: dish.id, reason: 'Fits' })) };
  answer.recommendations.unshift({ dishId: 'unknown', reason: 'Invented' }, { dishId: '1' });
  const { fetchImpl } = fakeGemini(answer);
  const chat = await getChatReply({ menu: dishes, prompt: 'food' }, { apiKey: 'test', fetchImpl });
  const picks = await recommendations(dishes, {}, { apiKey: 'test', fetchImpl });
  assert.equal(chat.recommendations.length, 8);
  assert.equal(chat.recommendations[0].reason, '');
  assert.equal(picks.recommendations.length, 5);
  assert.equal(picks.recommendations[0].reason, 'Fits');
});

test('both AI operations reject empty, thinking-only and invalid JSON replies', async () => {
  for (const parts of [[], [{ text: 'thinking', thought: true }], [{ text: '{bad json' }]]) {
    const options = {
      apiKey: 'test',
      fetchImpl: async () => ({ ok: true, json: async () => ({ candidates: [{ content: { parts } }] }) }),
    };
    await assert.rejects(getChatReply({ menu, prompt: 'pasta' }, options), /empty response|invalid JSON/);
    await assert.rejects(recommendations(menu, {}, options), /empty response|invalid JSON/);
  }
});
