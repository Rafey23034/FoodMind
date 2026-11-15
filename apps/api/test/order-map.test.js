const test = require('node:test');
const assert = require('node:assert/strict');
const http = require('node:http');
const config = require('../src/config');
const db = require('../src/db');
const maps = require('../src/services/maps');
const orders = require('../src/services/orders');
const app = require('../src/app');
const { signAccess } = require('../src/middleware/auth');

const httpFetch = fetch;
const restaurant = { lat: 31.47, lng: 74.27 };
const home = { lat: 31.52, lng: 74.35 };
// One order row as ORDER_SELECT returns it: customer 3, partner 4, rider 5.
const row = (extra = {}) => ({
  id: 9, status: 'picked_up', customer_id: 3, partner_id: 4, rider_id: 5,
  restaurant_lat: restaurant.lat, restaurant_lng: restaurant.lng,
  delivery_lat: home.lat, delivery_lng: home.lng, rider_lat: 31.5, rider_lng: 74.3, ...extra,
});

function withToken(t, token = 'test-token') {
  const previous = config.mapbox.accessToken;
  config.mapbox.accessToken = token;
  t.after(() => { config.mapbox.accessToken = previous; });
}

test('the static map URL draws the route and pins and fits them automatically', t => {
  withToken(t);
  const line = Array.from({ length: 200 }, (_, index) => ({ lat: 31.47 + index / 4000, lng: 74.27 + index / 2500 }));
  const url = maps.staticMapUrl({ line, markers: [{ ...restaurant, icon: 'restaurant', color: 'fa542b' }, { ...home, icon: 'home', color: '211b18' }], width: 600, height: 300 });
  const request = new URL(url);
  assert.match(request.pathname, /^\/styles\/v1\/mapbox\/streets-v12\/static\/geojson\(/);
  assert.match(request.pathname, /\/auto\/600x300@2x$/);
  assert.match(url, /pin-s-restaurant\+fa542b\(74\.27,31\.47\),pin-s-home\+211b18\(74\.35,31\.52\)/);
  assert.equal(request.searchParams.get('access_token'), 'test-token');
  assert.equal(request.searchParams.get('padding'), '40');
  // The colour's "#" must be encoded, and a long route is thinned to keep the URL short.
  assert.match(url, /%23FA542B/);
  const geojson = JSON.parse(decodeURIComponent(url.match(/geojson\(([^)]*)\)/)[1]));
  assert.ok(geojson.geometry.coordinates.length <= 61);
  assert.deepEqual(geojson.geometry.coordinates.at(-1), [line.at(-1).lng, line.at(-1).lat].map(value => Number(value.toFixed(5))));
  assert.ok(url.length < 8192);
});

test('staticMap returns PNG bytes, skips Mapbox without a token and reports failures as 502', async t => {
  withToken(t);
  const png = Buffer.from([0x89, 0x50, 0x4e, 0x47]);
  const stub = t.mock.method(global, 'fetch', async () => ({ ok: true, arrayBuffer: async () => png }));
  const markers = [{ ...home, icon: 'home', color: '211b18' }];
  assert.deepEqual(await maps.staticMap({ markers }), png);
  assert.equal(stub.mock.callCount(), 1);
  assert.equal(await maps.staticMap({ markers: [] }), null);
  stub.mock.mockImplementation(async () => ({ ok: false, status: 401 }));
  await assert.rejects(maps.staticMap({ markers }), error => error.status === 502);
  config.mapbox.accessToken = '';
  assert.equal(await maps.staticMap({ markers }), null);
  assert.equal(stub.mock.callCount(), 2);
});

test('an order map shows the rider only while the order is on its way', async t => {
  const one = t.mock.method(db, 'one', async () => row());
  t.mock.method(maps, 'computeRoute', async () => ({ coordinates: [restaurant, home] }));
  const draw = t.mock.method(maps, 'staticMap', async () => 'png');
  assert.equal(await orders.mapImage({ id: 5, role: 'rider' }, 9, { width: 400, height: 200 }), 'png');
  const sent = draw.mock.calls[0].arguments[0];
  assert.deepEqual(sent.markers.map(marker => marker.icon), ['restaurant', 'home', 'bicycle']);
  assert.deepEqual(sent.line, [restaurant, home]);
  assert.equal(sent.width, 400);

  one.mock.mockImplementation(async () => row({ status: 'delivered' }));
  await orders.mapImage({ id: 3, role: 'customer' }, 9, {});
  assert.deepEqual(draw.mock.calls[1].arguments[0].markers.map(marker => marker.icon), ['restaurant', 'home']);
  assert.deepEqual(draw.mock.calls[1].arguments[0].line, []);

  await assert.rejects(orders.mapImage({ id: 99, role: 'customer' }, 9, {}), error => error.status === 403);
});

test('GET /api/v1/maps/orders/:id needs a signed-in user and returns a PNG', async t => {
  t.mock.method(db, 'one', async () => row());
  t.mock.method(maps, 'computeRoute', async () => null);
  t.mock.method(maps, 'staticMap', async ({ width }) => (width === 999 ? null : Buffer.from('png')));
  const server = http.createServer(app);
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  t.after(() => new Promise(resolve => server.close(resolve)));
  const base = `http://127.0.0.1:${server.address().port}/api/v1/maps/orders/9`;
  const as = user => ({ headers: { Authorization: `Bearer ${signAccess(user)}` } });

  assert.equal((await httpFetch(base)).status, 401);
  const ok = await httpFetch(`${base}?width=400&height=200`, as({ id: 4, role: 'partner', email: 'p@food.com' }));
  assert.equal(ok.status, 200);
  assert.equal(ok.headers.get('content-type'), 'image/png');
  assert.equal(Buffer.from(await ok.arrayBuffer()).toString(), 'png');
  assert.equal((await httpFetch(`${base}?width=5000`, as({ id: 4, role: 'partner' }))).status, 400);
  assert.equal((await httpFetch(`${base}?width=999`, as({ id: 3, role: 'customer' }))).status, 404);
  assert.equal((await httpFetch(base, as({ id: 77, role: 'rider' }))).status, 403);
});
