process.env.DB_NAME = process.env.SMOKE_DB_NAME || 'foodmind_test';

const http = require('http');
const { once } = require('events');
const assert = require('node:assert/strict');
const app = require('../src/app');
const db = require('../src/db');

const results = [];
let server;

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function request(base, path, options = {}) {
  const response = await fetch(`${base}${path}`, {
    method: options.method || 'GET',
    headers: {
      ...(options.body ? { 'Content-Type': 'application/json' } : {}),
      ...(options.token ? { Authorization: `Bearer ${options.token}` } : {}),
      ...(options.idempotencyKey ? { 'Idempotency-Key': options.idempotencyKey } : {}),
    },
    body: options.body ? JSON.stringify(options.body) : undefined,
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(`${options.method || 'GET'} ${path} -> ${response.status}: ${data.error || 'request failed'}`);
  }
  return data;
}

function pass(name, details = '') {
  results.push({ name, details });
  console.log(`PASS  ${name}${details ? `: ${details}` : ''}`);
}

async function login(base, email) {
  const session = await request(base, '/auth/login', {
    method: 'POST',
    body: { email, password: '123456' },
  });
  assert.ok(session.accessToken, 'login should return an access token');
  return session;
}

async function run(base) {
  const health = await request(base, '/health');
  assert.equal(health.status, 'ok');
  pass('health', `database ${health.database}`);

  const customer = await login(base, 'demo@food.com');
  const partner = await login(base, 'partner@food.com');
  const rider = await login(base, 'rider@food.com');
  pass('login', 'customer, partner and rider');

  const catalog = await request(base, '/restaurants');
  assert.equal(catalog.restaurants.length, 3);
  assert.ok(catalog.restaurants.some(item => item.name === 'Urban Bites'));
  pass('catalog', `${catalog.restaurants.length} restaurants`);

  const menu = await request(base, '/restaurants/1/menu');
  assert.ok(menu.items.length >= 12);
  pass('menu', `${menu.items.length} items`);

  const addressBook = await request(base, '/addresses', { token: customer.accessToken });
  assert.ok(addressBook.addresses.length >= 2);
  const address = addressBook.addresses.find(item => item.isDefault) || addressBook.addresses[0];
  pass('addresses', address.label);

  const items = [
    { menuItemId: 1, quantity: 1, optionIds: [1] },
    { menuItemId: 5, quantity: 2 },
  ];
  const quote = await request(base, '/orders/quote', {
    method: 'POST',
    token: customer.accessToken,
    body: { restaurantId: 1, items },
  });
  assert.equal(quote.quote.total, quote.quote.subtotal + quote.quote.deliveryFee + quote.quote.platformFee);
  pass('quote', `Rs. ${quote.quote.total}`);

  const created = await request(base, '/orders', {
    method: 'POST',
    token: customer.accessToken,
    idempotencyKey: `smoke-${Date.now()}`,
    body: {
      restaurantId: 1,
      addressId: Number(address.id),
      items,
      note: 'API smoke test',
    },
  });
  const order = created.order;
  assert.equal(order.dbStatus, 'placed');
  assert.equal(order.items.length, 2);
  pass('create order', `#${order.id}`);

  await request(base, '/rider/location', {
    method: 'POST',
    token: rider.accessToken,
    body: { lat: 31.47, lng: 74.2735, accuracyM: 10 },
  });
  pass('rider location ping');

  const accepted = await request(base, `/partner/orders/${order.id}/accept`, {
    method: 'POST',
    token: partner.accessToken,
    body: { prepMinutes: 20 },
  });
  assert.equal(accepted.order.dbStatus, 'preparing');
  pass('partner accept', `ready ${accepted.order.estimatedReadyAt}`);

  let offer;
  for (let attempt = 0; attempt < 20; attempt += 1) {
    const current = await request(base, '/rider/offers/current', { token: rider.accessToken });
    if (current.offer) {
      offer = current.offer;
      break;
    }
    await sleep(200);
  }
  assert.ok(offer, 'the rider should receive a delivery offer');
  pass('rider offer', `${offer.distanceM}m, expires ${offer.expiresAt}`);

  const assigned = await request(base, `/rider/offers/${offer.id}/respond`, {
    method: 'POST',
    token: rider.accessToken,
    body: { action: 'accept' },
  });
  assert.ok(assigned.order.rider, 'accepting the offer should assign the rider');
  pass('rider accept offer', assigned.order.rider.name);

  await request(base, `/partner/orders/${order.id}/ready`, {
    method: 'POST',
    token: partner.accessToken,
  });
  pass('partner ready');

  const ready = await request(base, `/rider/orders/${order.id}`, { token: rider.accessToken });
  assert.match(String(ready.order.pickupCode), /^\d{4}$/);
  pass('pickup code', ready.order.pickupCode);

  await request(base, `/rider/orders/${order.id}/pickup`, {
    method: 'POST',
    token: rider.accessToken,
    body: { code: ready.order.pickupCode },
  });
  pass('rider pickup');

  await request(base, `/rider/orders/${order.id}/delivered`, {
    method: 'POST',
    token: rider.accessToken,
    body: { proofPhotoUrl: 'https://example.com/proof.jpg' },
  });
  pass('rider delivered');

  const tracking = await request(base, `/orders/${order.id}/tracking`, { token: customer.accessToken });
  assert.equal(tracking.order.dbStatus, 'delivered');
  assert.equal(tracking.order.isPaid, true);
  pass('customer tracking', 'delivered + cash collected');

  const history = await request(base, '/orders', { token: customer.accessToken });
  assert.ok(history.orders.some(item => item.id === order.id));
  pass('customer order history');
}

async function main() {
  server = http.createServer(app);
  server.listen(0, '127.0.0.1');
  await once(server, 'listening');
  const { port } = server.address();
  const base = `http://127.0.0.1:${port}/api/v1`;
  console.log(`Smoke testing ${process.env.DB_NAME} on ${base}\n`);

  try {
    await run(base);
    console.log(`\n${results.length} checks passed.`);
    process.exitCode = 0;
  } catch (error) {
    console.error(`\nFAIL  ${error.message}`);
    process.exitCode = 1;
  } finally {
    await new Promise(resolve => server.close(resolve));
    await db.pool.end();
  }
}

main();
