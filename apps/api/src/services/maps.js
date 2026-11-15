const config = require('../config');
const { distanceMeters, decodePolyline } = require('../utils/geo');
const { HttpError } = require('../errors');

const routeCache = new Map();
const CACHE_MS = 60 * 1000;

async function googleJson(url, options = {}) {
  const response = await fetch(url, options);
  const body = await response.json().catch(() => ({}));
  if (!response.ok) {
    const message = body?.error?.message || `Google Maps returned ${response.status}.`;
    throw new HttpError(502, message);
  }
  return body;
}

async function geocode(address) {
  if (!config.google.serverKey || !address?.trim()) return null;

  const params = new URLSearchParams({
    address,
    key: config.google.serverKey,
    language: config.google.language,
    region: config.google.region,
  });
  const body = await googleJson(`https://maps.googleapis.com/maps/api/geocode/json?${params}`);
  const result = body.results?.[0];
  if (!result) return null;

  return {
    lat: result.geometry.location.lat,
    lng: result.geometry.location.lng,
    formattedAddress: result.formatted_address,
  };
}

async function reverseGeocode(lat, lng) {
  if (!config.google.serverKey) {
    return { lat: Number(lat), lng: Number(lng), formattedAddress: null };
  }

  const params = new URLSearchParams({
    latlng: `${lat},${lng}`,
    key: config.google.serverKey,
    language: config.google.language,
    region: config.google.region,
  });
  const body = await googleJson(`https://maps.googleapis.com/maps/api/geocode/json?${params}`);
  const result = body.results?.[0];
  return {
    lat: Number(lat),
    lng: Number(lng),
    formattedAddress: result?.formatted_address || null,
  };
}

function fallbackRoute(origin, destination) {
  const distanceM = Math.max(1, Math.round(distanceMeters(origin, destination) * 1.25));
  const durationS = Math.max(60, Math.round(distanceM / 7));
  return {
    distanceM,
    durationS,
    coordinates: [origin, destination],
    provider: 'straight-line',
  };
}

async function computeRoute(origin, destination) {
  if (!origin || !destination) return null;

  const cacheKey = [
    origin.lat.toFixed(4),
    origin.lng.toFixed(4),
    destination.lat.toFixed(4),
    destination.lng.toFixed(4),
  ].join(':');
  const cached = routeCache.get(cacheKey);
  if (cached && Date.now() - cached.createdAt < CACHE_MS) return cached.value;

  let value;
  if (!config.google.serverKey) {
    value = fallbackRoute(origin, destination);
  } else {
    try {
      const body = await googleJson('https://routes.googleapis.com/directions/v2:computeRoutes', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Goog-Api-Key': config.google.serverKey,
          'X-Goog-FieldMask': 'routes.duration,routes.distanceMeters,routes.polyline.encodedPolyline',
        },
        body: JSON.stringify({
          origin: { location: { latLng: { latitude: origin.lat, longitude: origin.lng } } },
          destination: { location: { latLng: { latitude: destination.lat, longitude: destination.lng } } },
          travelMode: 'TWO_WHEELER',
          routingPreference: 'TRAFFIC_AWARE',
          polylineQuality: 'OVERVIEW',
          languageCode: config.google.language,
          regionCode: config.google.region,
          units: 'METRIC',
        }),
      });
      const route = body.routes?.[0];
      if (!route) throw new Error('No route returned.');
      const coordinates = decodePolyline(route.polyline?.encodedPolyline);
      value = {
        distanceM: Number(route.distanceMeters) || 0,
        durationS: Number(String(route.duration || '0s').replace('s', '')) || 0,
        coordinates: coordinates.length ? coordinates : [origin, destination],
        provider: 'google',
      };
    } catch (error) {
      console.warn('Google route failed, using straight-line fallback:', error.message);
      value = fallbackRoute(origin, destination);
    }
  }

  routeCache.set(cacheKey, { createdAt: Date.now(), value });
  return value;
}

module.exports = { geocode, reverseGeocode, computeRoute };
