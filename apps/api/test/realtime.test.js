const test = require('node:test');
const assert = require('node:assert/strict');
const http = require('node:http');
const { once } = require('node:events');
const WebSocket = require('ws');
const db = require('../src/db');
const realtime = require('../src/realtime');
const riders = require('../src/services/riders');
const dispatch = require('../src/services/dispatch');
const app = require('../src/app');
const { signAccess } = require('../src/middleware/auth');

// A real API server with the realtime socket attached, on a random local port.
async function startServer(t) {
  const server = http.createServer(app);
  const wss = realtime.attachRealtime(server);
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  t.after(async () => {
    for (const client of wss.clients) client.terminate();
    await new Promise(resolve => wss.close(() => resolve()));
    await new Promise(resolve => server.close(resolve));
  });
  return `ws://127.0.0.1:${server.address().port}${realtime.PATH}`;
}

// Connects as a user and collects every message it receives.
async function connect(base, user) {
  const socket = new WebSocket(`${base}?token=${encodeURIComponent(signAccess(user))}`);
  const messages = [];
  socket.on('message', raw => messages.push(JSON.parse(raw.toString())));
  await once(socket, 'open');
  await waitFor(() => messages.some(message => message.type === 'connected'));
  return { socket, messages };
}

async function waitFor(check) {
  for (let attempt = 0; attempt < 100; attempt += 1) {
    if (check()) return;
    await new Promise(resolve => setTimeout(resolve, 10));
  }
  assert.fail('Timed out waiting for a realtime message');
}

const rider = { id: 5, role: 'rider', email: 'r@food.com' };
const customer = { id: 3, role: 'customer', email: 'c@food.com' };
const partner = { id: 4, role: 'partner', email: 'p@food.com' };

test('only signed-in users can open the socket', async t => {
  const base = await startServer(t);
  const anonymous = new WebSocket(base);
  const [error] = await once(anonymous, 'error');
  assert.match(error.message, /401/);
  const wrongPath = new WebSocket(base.replace('/realtime', '/other') + `?token=${signAccess(rider)}`);
  await once(wrongPath, 'error');
});

test('send reaches only that user, and order updates reach everyone on the order except the sender', async t => {
  const base = await startServer(t);
  const [riderSocket, customerSocket, partnerSocket] = await Promise.all([connect(base, rider), connect(base, customer), connect(base, partner)]);
  t.after(() => [riderSocket, customerSocket, partnerSocket].forEach(({ socket }) => socket.close()));

  realtime.send(5, 'delivery.offer', { offerId: '12' });
  await waitFor(() => riderSocket.messages.some(message => message.type === 'delivery.offer'));
  assert.equal(customerSocket.messages.filter(message => message.type === 'delivery.offer').length, 0);

  t.mock.method(db, 'one', async () => ({ customer_id: 3, partner_id: 4, rider_id: 5 }));
  await realtime.notifyOrder(9, 'order.rider_location', {}, { except: 5 });
  await waitFor(() => customerSocket.messages.some(message => message.type === 'order.rider_location')
    && partnerSocket.messages.some(message => message.type === 'order.rider_location'));
  assert.deepEqual(customerSocket.messages.at(-1), { type: 'order.rider_location', data: { orderId: '9' } });
  assert.equal(riderSocket.messages.filter(message => message.type === 'order.rider_location').length, 0);
});

test('riders send their location over the socket; bad or non-rider messages are not saved', async t => {
  const base = await startServer(t);
  const ping = t.mock.method(riders, 'ping', async () => ({}));
  const riderSocket = await connect(base, rider);
  const customerSocket = await connect(base, customer);
  t.after(() => [riderSocket, customerSocket].forEach(({ socket }) => socket.close()));

  riderSocket.socket.send(JSON.stringify({ type: 'rider.location', data: { lat: 31.47, lng: 74.27, accuracyM: 20 } }));
  await waitFor(() => ping.mock.callCount() === 1);
  assert.deepEqual(ping.mock.calls[0].arguments, [5, { lat: 31.47, lng: 74.27, accuracyM: 20 }]);

  riderSocket.socket.send(JSON.stringify({ type: 'rider.location', data: { lat: 200, lng: 74 } }));
  await waitFor(() => riderSocket.messages.some(message => message.type === 'error'));
  customerSocket.socket.send(JSON.stringify({ type: 'rider.location', data: { lat: 31, lng: 74 } }));
  riderSocket.socket.send('not json');
  await new Promise(resolve => setTimeout(resolve, 50));
  assert.equal(ping.mock.callCount(), 1);
});

test('a saved rider location tells the customer and restaurant of the active order, not the rider', async t => {
  t.mock.method(db, 'one', async sql => {
    if (sql.includes('FROM riders rd')) return { user_id: 5, status: 'active', is_online: 1, lat: 31.47, lng: 74.27 };
    if (sql.includes('active_rider_id')) return { id: 9 };
    return null;
  });
  t.mock.method(db, 'transaction', async work => work({ query: async () => [{}] }));
  const notify = t.mock.method(realtime, 'notifyOrder', async () => {});
  await riders.ping(5, { lat: 31.47, lng: 74.27 });
  assert.deepEqual(notify.mock.calls[0].arguments, [9, 'order.rider_location', {}, { except: 5 }]);
});

test('expired offers are pushed to their rider before the order is offered to the next one', async t => {
  t.mock.method(db, 'query', async sql => (sql.includes('SELECT id, order_id, rider_id') ? [{ id: 12, order_id: 9, rider_id: 5 }] : sql.startsWith('CALL') ? [[], {}] : {}));
  const send = t.mock.method(realtime, 'send', () => {});
  await dispatch.sweepExpiredOffers();
  assert.deepEqual(send.mock.calls[0].arguments, [5, 'offer.expired', { offerId: '12', orderId: '9' }]);
});
