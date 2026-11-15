const config = require('../config');
const { distanceMeters } = require('../utils/geo');
const { HttpError } = require('../errors');

const routeCache = new Map();
const CACHE_MS = 60 * 1000;

async function mapboxJson(path, parameters) {
  const params = new URLSearchParams({ ...parameters, access_token: config.mapbox.accessToken });
  let response;
  try {
    response = await fetch(`https://api.mapbox.com/${path}?${params}`, {
      signal: AbortSignal.timeout(10000),
    });
  } catch {
    throw new HttpError(502, 'Mapbox is unavailable. Try again.');
  }
  const body = await response.json().catch(() => null);
  if (!response.ok || !body) {
    throw new HttpError(502, body?.message || `Mapbox returned ${response.status}.`);
  }
  return body;
}

function featureLocation(feature) {
  const coordinates = feature?.geometry?.coordinates;
  if (!Array.isArray(coordinates) || coordinates.length !== 2 || !coordinates.every(Number.isFinite)) return null;
  const [lng, lat] = coordinates;
  const properties = feature.properties || {};
  return {
    lat, lng,
    formattedAddress: properties.full_address ||
      [properties.name, properties.place_formatted].filter(Boolean).join(', ') || null,
  };
}

async function geocode(address) {
  if (!config.mapbox.accessToken || !address?.trim()) return null;
  const body = await mapboxJson('search/geocode/v6/forward', {
    q: address.trim(),
    language: config.mapbox.language,
    country: config.mapbox.country,
    limit: 1,
    autocomplete: false,
    // Address coordinates are stored in MySQL, so request permanent results.
    permanent: true,
  });
  return featureLocation(body.features?.[0]);
}

async function reverseGeocode(lat, lng) {
  let formattedAddress = null;
  if (config.mapbox.accessToken) {
    const body = await mapboxJson('search/geocode/v6/reverse', {
      latitude: lat,
      longitude: lng,
      language: config.mapbox.language,
      permanent: true,
    });
    formattedAddress = featureLocation(body.features?.[0])?.formattedAddress || null;
  }
  return { lat: Number(lat), lng: Number(lng), formattedAddress };
}

function fallbackRoute(origin, destination) {
  const distanceM = Math.max(1, Math.round(distanceMeters(origin, destination) * 1.25));
  return {
    distanceM,
    durationS: Math.max(60, Math.round(distanceM / 7)),
    coordinates: [origin, destination],
    provider: 'straight-line',
  };
}

async function computeRoute(origin, destination) {
  if (!origin || !destination) return null;
  if (!config.mapbox.accessToken) return fallbackRoute(origin, destination);

  const cacheKey = [origin.lat, origin.lng, destination.lat, destination.lng]
    .map(value => value.toFixed(4)).join(':');
  const cached = routeCache.get(cacheKey);
  if (cached && Date.now() - cached.createdAt < CACHE_MS) return cached.value;

  let value;
  try {
    // Mapbox expects longitude,latitude; GeoJSON avoids encoded-polyline decoding.
    const points = `${origin.lng},${origin.lat};${destination.lng},${destination.lat}`;
    const body = await mapboxJson(`directions/v5/mapbox/driving-traffic/${points}`, {
      geometries: 'geojson', overview: 'simplified', steps: false,
    });
    const route = body.routes?.[0];
    if (body.code !== 'Ok' || !route || !Number.isFinite(route.distance) ||
        !Number.isFinite(route.duration) || route.distance < 0 || route.duration < 0) {
      throw new Error('No valid route returned.');
    }
    const coordinates = route.geometry.coordinates.map(([lng, lat]) => ({ lat, lng }));
    if (coordinates.length < 2 || coordinates.some(point => !Number.isFinite(point.lat) || !Number.isFinite(point.lng))) {
      throw new Error('No valid route geometry returned.');
    }
    value = { distanceM: route.distance, durationS: route.duration, coordinates, provider: 'mapbox' };
  } catch (error) {
    console.warn('Mapbox route failed, using straight-line fallback:', error.message);
    value = fallbackRoute(origin, destination);
  }

  routeCache.set(cacheKey, { createdAt: Date.now(), value });
  return value;
}

const MAP_STYLE = 'mapbox/streets-v12';
const MAX_LINE_POINTS = 60;
const round = value => Number(Number(value).toFixed(5));

// Mapbox Static Images URL: the route as a GeoJSON line, one pin per stop, framed automatically ("auto").
function staticMapUrl({ line = [], markers = [], width, height }) {
  const overlays = [];
  if (line.length >= 2) {
    // Fewer points keep the URL well under Mapbox's 8,192-character limit.
    const step = Math.ceil(line.length / MAX_LINE_POINTS);
    const points = line.filter((point, index) => index % step === 0 || index === line.length - 1);
    const feature = {
      type: 'Feature',
      properties: { stroke: '#FA542B', 'stroke-width': 4 },
      geometry: { type: 'LineString', coordinates: points.map(point => [round(point.lng), round(point.lat)]) },
    };
    overlays.push(`geojson(${encodeURIComponent(JSON.stringify(feature))})`);
  }
  for (const marker of markers) overlays.push(`pin-s-${marker.icon}+${marker.color}(${round(marker.lng)},${round(marker.lat)})`);
  const params = new URLSearchParams({ padding: '40', access_token: config.mapbox.accessToken });
  return `https://api.mapbox.com/styles/v1/${MAP_STYLE}/static/${overlays.join(',')}/auto/${width}x${height}@2x?${params}`;
}

// Returns the map as PNG bytes, or null when there is no token or nothing to draw.
async function staticMap({ line, markers, width = 600, height = 300 }) {
  if (!config.mapbox.accessToken || !markers?.length) return null;
  let response;
  try {
    response = await fetch(staticMapUrl({ line, markers, width, height }), { signal: AbortSignal.timeout(10000) });
  } catch {
    throw new HttpError(502, 'Mapbox is unavailable. Try again.');
  }
  if (!response.ok) throw new HttpError(502, `Mapbox returned ${response.status}.`);
  return Buffer.from(await response.arrayBuffer());
}

module.exports = { geocode, reverseGeocode, computeRoute, staticMap, staticMapUrl };
