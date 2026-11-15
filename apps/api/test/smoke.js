process.env.DB_NAME = process.env.SMOKE_DB_NAME || 'foodmind_test';
// Provider responses are covered by maps.test.js; this flow exercises the real DB offline.
process.env.MAPBOX_ACCESS_TOKEN = '';

const http = require('http');
const { once } = require('events');
const assert = require('node:assert/strict');
const WebSocket = require('ws');
const app = require('../src/app');
const db = require('../src/db');
const { attachRealtime } = require('../src/realtime');

const results = [];
let server;
let riderSocket;

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

  const refreshed = await request(base, '/auth/refresh', {
    method: 'POST', body: { refreshToken: customer.refreshToken },
  });
  assert.equal(refreshed.user.email, customer.user.email);
  assert.ok(refreshed.accessToken);
  pass('refresh session');

  const events = [];
  riderSocket = new WebSocket(`${base.replace('http:', 'ws:')}/realtime?token=${encodeURIComponent(rider.accessToken)}`);
  riderSocket.on('message', message => events.push(JSON.parse(message.toString())));
  await once(riderSocket, 'open');

  const catalog = await request(base, '/restaurants');
  assert.equal(catalog.restaurants.length, 3);
  assert.ok(catalog.restaurants.some(item => item.name === 'Urban Bites'));
  pass('catalog', `${catalog.restaurants.length} restaurants`);

  const menu = await request(base, '/restaurants/1/menu');
  assert.ok(menu.items.length >= 12);
  const detail = await request(base, `/menu-items/${menu.items[0].id}`);
  assert.deepEqual(detail.item, menu.items[0]);
  pass('menu', `${menu.items.length} items`);

  const addressBook = await request(base, '/addresses', { token: customer.accessToken });
  assert.ok(addressBook.addresses.length >= 2);
  const address = addressBook.addresses.find(item => item.isDefault) || addressBook.addresses[0];
  pass('addresses', address.label);

  const saved = await request(base, '/addresses', {
    method: 'POST', token: customer.accessToken,
    body: { label: 'Smoke', street: '12 Test Road', area: 'Johar Town', city: 'Lahore', lat: 31.47, lng: 74.27 },
  });
  const savedId = saved.address.id;
  await request(base, `/addresses/${savedId}`, {
    method: 'PATCH', token: customer.accessToken, body: { label: 'Office' },
  });
  await request(base, `/addresses/${savedId}`, {
    method: 'PATCH', token: customer.accessToken, body: { isDefault: true },
  });
  const editedBook = await request(base, '/addresses', { token: customer.accessToken });
  const edited = editedBook.addresses.find(value => value.id === savedId);
  assert.equal(edited.label, 'Office');
  assert.equal(edited.area, 'Johar Town');
  assert.equal(edited.street, '12 Test Road');
  assert.equal(edited.isDefault, true);
  assert.ok(Math.abs(edited.location.lat - 31.47) < 1e-9);
  assert.ok(Math.abs(edited.location.lng - 74.27) < 1e-9);
  await request(base, `/addresses/${address.id}/default`, { method: 'POST', token: customer.accessToken });
  await request(base, `/addresses/${savedId}`, { method: 'DELETE', token: customer.accessToken });
  pass('partial address PATCH', 'omitted fields and coordinates preserved');

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
    if (current.offer && events.some(event => event.type === 'delivery.offer')) {
      offer = current.offer;
      break;
    }
    await sleep(200);
  }
  assert.ok(offer, 'the rider should receive a delivery offer');
  pass('rider offer', `${offer.distanceM}m, expires ${offer.expiresAt}`);
  const offerEvent = events.find(event => event.type === 'delivery.offer').data;
  assert.equal(offerEvent.offerId, offer.id);
  assert.equal(offerEvent.orderId, order.id);
  assert.equal(offerEvent.restaurantId, '1');
  assert.equal(offerEvent.distanceM, offer.distanceM);
  assert.equal(offerEvent.expiresAt, offer.expiresAt);
  assert.ok(offer.deliveryFee > 0, 'the offer should show the fixed delivery fee');
  pass('WebSocket offer', `real offer ID, distance, expiry and fee Rs. ${offer.deliveryFee}`);

  const assigned = await request(base, `/rider/offers/${offer.id}/respond`, {
    method: 'POST',
    token: rider.accessToken,
    body: { action: 'accept' },
  });
  assert.ok(assigned.order.rider, 'accepting the offer should assign the rider');
  pass('rider accept offer', assigned.order.rider.name);

  const delayed = await request(base, `/partner/orders/${order.id}/delay`, {
    method: 'POST', token: partner.accessToken, body: { minutes: 5 },
  });
  assert.equal(delayed.order.delayMinutes, 5);
  assert.equal(Date.parse(delayed.order.estimatedReadyAt) - Date.parse(accepted.order.estimatedReadyAt), 5 * 60000);
  pass('partner delay');

  const activeTracking = await request(base, `/orders/${order.id}/tracking`, { token: customer.accessToken });
  assert.equal(activeTracking.route.provider, 'straight-line');
  assert.equal(activeTracking.route.coordinates.length, 2);
  assert.ok(activeTracking.eta.durationS > 0);
  pass('active tracking', 'route and ETA contract');

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

  const delivered = await request(base, `/rider/orders/${order.id}/delivered`, {
    method: 'POST',
    token: rider.accessToken,
    body: { proofPhotoUrl: 'https://example.com/proof.jpg' },
  });
  assert.equal(delivered.order.proofPhotoUrl, 'https://example.com/proof.jpg');
  pass('rider delivered');

  const tracking = await request(base, `/orders/${order.id}/tracking`, { token: customer.accessToken });
  assert.equal(tracking.order.dbStatus, 'delivered');
  assert.equal(tracking.order.isPaid, true);
  pass('customer tracking', 'delivered + cash collected');

  const history = await request(base, '/orders', { token: customer.accessToken });
  assert.ok(history.orders.some(item => item.id === order.id));
  pass('customer order history');

  const historyRows = await db.query(
    'SELECT status, changed_by FROM order_status_history WHERE order_id = ? ORDER BY id', [order.id]
  );
  assert.deepEqual(historyRows.map(row => row.status), ['placed', 'preparing', 'ready', 'picked_up', 'delivered']);
  assert.deepEqual(historyRows.map(row => Number(row.changed_by)), [1, 2, 2, 5, 5]);
  const connection = await db.pool.getConnection();
  try {
    const [[actor]] = await connection.query('SELECT @app_user_id AS actor');
    assert.equal(actor.actor, null);
  } finally {
    connection.release();
  }
  pass('DB actor attribution', 'correct history; pooled actor cleared');
}

async function main() {
  server = http.createServer(app);
  const realtime = attachRealtime(server);
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
    if (riderSocket) riderSocket.terminate();
    await new Promise(resolve => realtime.close(resolve));
    await new Promise(resolve => server.close(resolve));
    await db.pool.end();
  }
}

main();
