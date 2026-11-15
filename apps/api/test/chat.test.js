const test = require('node:test');
const assert = require('node:assert/strict');
const { buildGeminiRequest, cleanResult, createServer, getChatReply } = require('../index');

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
    recommendations: [{ dishId: 'made-up', reason: 'x' }, { dishId: 'creamy-pasta', reason: 'Creamy' }, { dishId: 'creamy-pasta', reason: 'again' }],
    suggestions: ['Cheaper', '', 'Spicy', 'Vegetarian', 'Fourth'],
  }, menu);
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

test('the HTTP endpoint validates input and answers chat turns', async () => {
  const { fetchImpl } = fakeGemini({ reply: 'Sure.', recommendations: [{ dishId: 'creamy-pasta', reason: 'Fits' }], suggestions: ['Cheaper'] });
  const server = createServer({ apiKey: 'test', fetchImpl });
  await new Promise(resolve => server.listen(0, resolve));
  const base = `http://127.0.0.1:${server.address().port}`;
  const post = (path, body) => fetch(base + path, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
  try {
    assert.equal((await post('/api/ai/chat', { menu })).status, 400);
    assert.equal((await post('/api/ai/chat', { prompt: 'pasta' })).status, 400);
    const ok = await post('/api/ai/chat', { menu, prompt: 'pasta', history: [] });
    assert.equal(ok.status, 200);
    assert.deepEqual(await ok.json(), { reply: 'Sure.', title: '', recommendations: [{ dishId: 'creamy-pasta', reason: 'Fits' }], suggestions: ['Cheaper'] });
    assert.equal((await post('/api/ai/recommendations', { menu, prompt: 'pasta' })).status, 200);
  } finally {
    server.close();
  }
});

test('Gemini failures return a generic 502 without internal details', async () => {
  const fetchImpl = async () => ({ ok: false, status: 429, json: async () => ({ error: { message: 'quota exceeded for key abc' } }) });
  const server = createServer({ apiKey: 'test', fetchImpl });
  await new Promise(resolve => server.listen(0, resolve));
  const original = console.error;
  console.error = () => {};
  try {
    const res = await fetch(`http://127.0.0.1:${server.address().port}/api/ai/chat`, { method: 'POST', body: JSON.stringify({ menu, prompt: 'pasta' }) });
    assert.equal(res.status, 502);
    assert.deepEqual(await res.json(), { error: 'Unable to generate AI recommendations.' });
  } finally {
    console.error = original;
    server.close();
  }
});
