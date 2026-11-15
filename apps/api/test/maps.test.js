const { test, beforeEach } = require('node:test');
const assert = require('node:assert/strict');
const config = require('../src/config');

let maps;
beforeEach(t => {
  const previous = { ...config.mapbox };
  Object.assign(config.mapbox, { accessToken: 'test-token', language: 'en', country: 'pk' });
  t.after(() => Object.assign(config.mapbox, previous));
  delete require.cache[require.resolve('../src/services/maps')];
  maps = require('../src/services/maps');
});

const origin = { lat: 31.47, lng: 74.27 };
const destination = { lat: 31.52, lng: 74.35 };
const feature = {
  geometry: { type: 'Point', coordinates: [74.275, 31.475] },
  properties: { full_address: '12 Main Road, Lahore, Pakistan' },
};

test('forward geocoding uses Mapbox v6 permanent results and returns the existing address shape', async t => {
  t.mock.method(global, 'fetch', async url => {
    const request = new URL(url);
    assert.equal(request.origin + request.pathname, 'https://api.mapbox.com/search/geocode/v6/forward');
    assert.equal(request.searchParams.get('q'), '12 Main Road, Lahore');
    assert.equal(request.searchParams.get('access_token'), 'test-token');
    assert.equal(request.searchParams.get('country'), 'pk');
    assert.equal(request.searchParams.get('permanent'), 'true');
    assert.equal(request.searchParams.get('autocomplete'), 'false');
    return { ok: true, json: async () => ({ features: [feature] }) };
  });
  assert.deepEqual(await maps.geocode(' 12 Main Road, Lahore '), {
    lat: 31.475, lng: 74.275, formattedAddress: feature.properties.full_address,
  });
});

test('reverse geocoding preserves the requested point and formats Mapbox address components', async t => {
  t.mock.method(global, 'fetch', async url => {
    const request = new URL(url);
    assert.equal(request.pathname, '/search/geocode/v6/reverse');
    assert.equal(request.searchParams.get('longitude'), '74.27');
    assert.equal(request.searchParams.get('latitude'), '31.47');
    return { ok: true, json: async () => ({ features: [{
      ...feature, properties: { name: 'Main Road', place_formatted: 'Lahore, Pakistan' },
    }] }) };
  });
  assert.deepEqual(await maps.reverseGeocode(origin.lat, origin.lng), {
    ...origin, formattedAddress: 'Main Road, Lahore, Pakistan',
  });
});

test('geocoding distinguishes no match from a Mapbox failure', async t => {
  const stub = t.mock.method(global, 'fetch', async () => ({ ok: true, json: async () => ({ features: [] }) }));
  assert.equal(await maps.geocode('Unknown street'), null);
  stub.mock.mockImplementation(async () => ({ ok: true, json: async () => ({ features: [{ geometry: { coordinates: [] } }] }) }));
  assert.equal(await maps.geocode('Invalid result'), null);
  stub.mock.mockImplementation(async () => ({ ok: false, status: 401, json: async () => ({ message: 'Not Authorized' }) }));
  await assert.rejects(maps.geocode('Main Road'), error => error.status === 502);
});

test('directions uses longitude/latitude, converts GeoJSON, and caches then refreshes the route', async t => {
  let now = 100000;
  t.mock.method(Date, 'now', () => now);
  const stub = t.mock.method(global, 'fetch', async url => {
    const request = new URL(url);
    assert.equal(request.pathname, '/directions/v5/mapbox/driving-traffic/74.27,31.47;74.35,31.52');
    assert.equal(request.searchParams.get('geometries'), 'geojson');
    return { ok: true, json: async () => ({ code: 'Ok', routes: [{
      distance: 1200.5, duration: 240.2,
      geometry: { type: 'LineString', coordinates: [[74.27, 31.47], [74.30, 31.49], [74.35, 31.52]] },
    }] }) };
  });
  const route = await maps.computeRoute(origin, destination);
  assert.deepEqual(route, {
    distanceM: 1200.5, durationS: 240.2, provider: 'mapbox',
    coordinates: [origin, { lat: 31.49, lng: 74.30 }, destination],
  });
  assert.deepEqual(await maps.computeRoute(origin, destination), route);
  assert.equal(stub.mock.callCount(), 1);
  now += 61000;
  await maps.computeRoute(origin, destination);
  assert.equal(stub.mock.callCount(), 2);
});

test('routing falls back on HTTP errors, no route, invalid geometry, and network failure', async t => {
  t.mock.method(console, 'warn', () => {});
  const responses = [
    async () => ({ ok: false, status: 429, json: async () => ({ message: 'Rate limited' }) }),
    async () => ({ ok: true, json: async () => ({ code: 'NoRoute', routes: [] }) }),
    async () => ({ ok: true, json: async () => ({ code: 'Ok', routes: [{ distance: 10, duration: 5, geometry: { coordinates: [] } }] }) }),
    async () => { throw new Error('Connection failed'); },
  ];
  const stub = t.mock.method(global, 'fetch', responses[0]);
  for (const [index, response] of responses.entries()) {
    stub.mock.mockImplementation(response);
    const start = { ...origin, lat: origin.lat + index / 100 };
    const route = await maps.computeRoute(start, destination);
    assert.equal(route.provider, 'straight-line');
    assert.ok(route.distanceM > 0 && route.durationS > 0);
    assert.deepEqual(route.coordinates, [start, destination]);
  }
});

test('demo fallbacks make no provider requests without a token', async t => {
  config.mapbox.accessToken = '';
  const stub = t.mock.method(global, 'fetch', async () => { throw new Error('Unexpected request'); });
  assert.equal(await maps.geocode('Main Road'), null);
  assert.deepEqual(await maps.reverseGeocode(origin.lat, origin.lng), { ...origin, formattedAddress: null });
  assert.equal((await maps.computeRoute(origin, destination)).provider, 'straight-line');
  assert.equal(await maps.computeRoute(null, destination), null);
  assert.equal(stub.mock.callCount(), 0);
});
