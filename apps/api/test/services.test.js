const test = require('node:test');
const assert = require('node:assert/strict');
const bcrypt = require('bcryptjs');
const db = require('../src/db');
const maps = require('../src/services/maps');
const realtime = require('../src/realtime');
const dispatch = require('../src/services/dispatch');
const addresses = require('../src/services/addresses');
const orders = require('../src/services/orders');
const auth = require('../src/services/auth');

test('transactions set/reset the actor on success, rollback and connection reuse', async t => {
  let actor = 99;
  const events = [];
  const connection = {
    beginTransaction: async () => events.push('begin'),
    query: async (sql, params) => { actor = params ? params[0] : null; events.push(['actor', actor]); },
    commit: async () => events.push('commit'),
    rollback: async () => events.push('rollback'),
    release: () => events.push('release'),
    destroy: () => events.push('destroy'),
  };
  t.mock.method(db.pool, 'getConnection', async () => connection);
  assert.equal(await db.transaction(async () => { assert.equal(actor, 7); return 'saved'; }, 7), 'saved');
  assert.equal(actor, null);
  await assert.rejects(db.transaction(async () => {
    assert.equal(actor, 8);
    throw new Error('work failed');
  }, 8), /work failed/);
  assert.equal(actor, null);
  await db.transaction(async () => assert.equal(actor, null));
  assert.deepEqual(events, [
    'begin', ['actor', 7], 'commit', ['actor', null], 'release',
    'begin', ['actor', 8], 'rollback', ['actor', null], 'release',
    'begin', ['actor', null], 'commit', ['actor', null], 'release',
  ]);
});

test('a connection whose actor cannot be cleared is destroyed rather than reused', async t => {
  let destroyed = false;
  let released = false;
  t.mock.method(db.pool, 'getConnection', async () => ({
    beginTransaction: async () => {}, commit: async () => {}, rollback: async () => {},
    query: async sql => { if (sql.endsWith('NULL')) throw new Error('Connection lost'); },
    release: () => { released = true; }, destroy: () => { destroyed = true; },
  }));
  await db.transaction(async () => {}, 1);
  assert.equal(destroyed, true);
  assert.equal(released, false);
});

test('dispatch unwraps mysql2 procedure result sets and sends the real rider/offer payload', async t => {
  const offer = { offer_id: 12, rider_id: 5, distance_m: 74, expires_at: '2026-11-15 12:00:00' };
  const query = t.mock.method(db, 'query', async () => [[offer], { affectedRows: 0 }]);
  t.mock.method(db, 'one', async () => ({ id: 9, restaurant_id: 1 }));
  const send = t.mock.method(realtime, 'send', () => {});
  const notify = t.mock.method(realtime, 'notifyOrder', async () => {});
  const payload = await dispatch.offerNext(9);
  assert.deepEqual(send.mock.calls[0].arguments, [5, 'delivery.offer', payload]);
  assert.deepEqual(payload, {
    offerId: '12', orderId: '9', restaurantId: '1', distanceM: 74, expiresAt: '2026-11-15T12:00:00Z',
  });
  query.mock.mockImplementation(async () => [[], { affectedRows: 0 }]);
  assert.equal(await dispatch.offerNext(9), null);
  assert.equal(send.mock.callCount(), 1);
  assert.equal(notify.mock.callCount(), 1);
});

const existingAddress = {
  id: 2, label: 'Home', street: '12 Main Road', area: 'Johar Town', city: 'Lahore',
  is_default: 0, lat: 31.47, lng: 74.27,
};

function mockAddress(t) {
  t.mock.method(db, 'one', async () => ({ ...existingAddress }));
  const writes = [];
  t.mock.method(db, 'transaction', async work => work({ query: async (sql, params) => {
    writes.push({ sql, params });
    return [{ affectedRows: 1 }];
  } }));
  return writes;
}

test('partial address updates preserve omitted fields and do not geocode a default/label-only change', async t => {
  const writes = mockAddress(t);
  const geocode = t.mock.method(maps, 'geocode', async () => { throw new Error('Unexpected geocoding'); });
  assert.deepEqual(await addresses.update(1, 2, { isDefault: true }), { id: '2' });
  assert.match(writes[0].sql, /is_default = FALSE/);
  assert.deepEqual(writes[1].params, ['Home', '12 Main Road', 'Johar Town', 'Lahore', 'POINT(74.27 31.47)', true, 2, 1]);
  await addresses.update(1, 2, { label: 'Office' });
  assert.equal(writes[2].params[0], 'Office');
  assert.equal(geocode.mock.callCount(), 0);
});

test('address edits geocode the merged address, preserve existing coordinates on no match, and support explicit null area', async t => {
  const writes = mockAddress(t);
  const geocode = t.mock.method(maps, 'geocode', async () => null);
  await addresses.update(1, 2, { city: 'Karachi', area: null });
  assert.deepEqual(geocode.mock.calls[0].arguments, ['12 Main Road, Karachi']);
  assert.deepEqual(writes[0].params.slice(0, 5), ['Home', '12 Main Road', null, 'Karachi', 'POINT(74.27 31.47)']);
  await addresses.update(1, 2, { lat: 31.48 });
  assert.equal(writes[1].params[4], 'POINT(74.27 31.48)');
  assert.equal(geocode.mock.callCount(), 1);
});

test('tracking reads the order once and preserves ownership checks before hydration/routing', async t => {
  const row = {
    id: 9, customer_id: 1, partner_id: 2, rider_id: 5, status: 'picked_up',
    restaurant_lat: 31.47, restaurant_lng: 74.27,
    rider_lat: 31.48, rider_lng: 74.28, delivery_lat: 31.5, delivery_lng: 74.3,
  };
  const one = t.mock.method(db, 'one', async () => row);
  const items = t.mock.method(db, 'query', async () => []);
  const route = t.mock.method(maps, 'computeRoute', async () => ({ durationS: 120, coordinates: [] }));
  const result = await orders.tracking({ id: 1, role: 'customer' }, 9);
  assert.equal(one.mock.callCount(), 1);
  assert.equal(items.mock.callCount(), 1);
  assert.deepEqual(route.mock.calls[0].arguments, [{ lat: 31.48, lng: 74.28 }, { lat: 31.5, lng: 74.3 }]);
  assert.equal(result.dbStatus, 'picked_up');
  await assert.rejects(orders.tracking({ id: 8, role: 'customer' }, 9), error => error.status === 403);
  assert.equal(items.mock.callCount(), 1);
  one.mock.mockImplementation(async () => null);
  await assert.rejects(orders.tracking({ id: 1, role: 'customer' }, 9), error => error.status === 404);
});

test('login and refresh reuse the validated user row without exposing the password hash', async t => {
  const user = { id: 1, role: 'customer', full_name: 'Diner', email: 'demo@food.com', status: 'active', password_hash: 'hash' };
  const one = t.mock.method(db, 'one', async () => user);
  t.mock.method(bcrypt, 'compare', async () => true);
  const loggedIn = await auth.login({ email: 'demo@food.com', password: '123456' });
  assert.equal(one.mock.callCount(), 1);
  assert.equal(loggedIn.name, 'Diner');
  assert.equal(loggedIn.password_hash, undefined);
  const refreshed = await auth.refresh(1);
  assert.equal(one.mock.callCount(), 2);
  assert.deepEqual(refreshed, loggedIn);
});
