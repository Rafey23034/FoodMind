import { Platform } from 'react-native';

const fallbackOrigin = Platform.OS === 'android' ? 'http://10.0.2.2:3001' : 'http://localhost:3001';
const configured = (process.env.EXPO_PUBLIC_API_URL || fallbackOrigin).replace(/\/+$/, '');

// The mobile app talks to version 1 routes. A bare host is enough in .env.
export const API_ORIGIN = configured.replace(/\/api\/v1$/, '');
export const API_BASE_URL = `${API_ORIGIN}/api/v1`;
export const API_ENABLED = process.env.NODE_ENV !== 'test' && process.env.EXPO_PUBLIC_API_ENABLED !== 'false';

let session = { accessToken: null, refreshToken: null };
let sessionListener = null;
let refreshing = null;

export class ApiError extends Error {
  constructor(message, status = 0, details) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.details = details;
  }
}

export function setApiSession(tokens, listener) {
  session = {
    accessToken: tokens?.accessToken || null,
    refreshToken: tokens?.refreshToken || null,
  };
  if (listener !== undefined) sessionListener = listener;
}

export function clearApiSession(notify = false) {
  session = { accessToken: null, refreshToken: null };
  if (notify) sessionListener?.(null);
}

export function getApiSession() {
  return { ...session };
}

function urlFor(path) {
  return path.startsWith('http') ? path : `${API_BASE_URL}${path.startsWith('/') ? path : `/${path}`}`;
}

async function send(path, { method = 'GET', body, headers = {}, token } = {}) {
  const requestHeaders = { ...headers };
  if (body !== undefined) requestHeaders['Content-Type'] = 'application/json';
  if (token) requestHeaders.Authorization = `Bearer ${token}`;

  let response;
  try {
    response = await fetch(urlFor(path), {
      method,
      headers: requestHeaders,
      body: body === undefined ? undefined : JSON.stringify(body),
    });
  } catch (error) {
    throw new ApiError('Cannot reach FoodMind. Check that the API is running.', 0, error);
  }

  const payload = await response.json().catch(() => ({}));
  return { response, payload };
}

async function refreshAccessToken() {
  if (!session.refreshToken) throw new ApiError('Your session has expired. Sign in again.', 401);
  if (refreshing) return refreshing;

  refreshing = (async () => {
    const { response, payload } = await send('/auth/refresh', {
      method: 'POST',
      body: { refreshToken: session.refreshToken },
    });
    if (!response.ok) {
      clearApiSession(true);
      throw new ApiError(payload.error || 'Your session has expired. Sign in again.', response.status, payload.details);
    }
    const next = { accessToken: payload.accessToken, refreshToken: payload.refreshToken };
    setApiSession(next);
    sessionListener?.(next);
    return next;
  })();

  try {
    return await refreshing;
  } finally {
    refreshing = null;
  }
}

export async function apiRequest(path, { method = 'GET', body, headers, authenticated = true, retry = true } = {}) {
  let result = await send(path, { method, body, headers, token: authenticated ? session.accessToken : null });

  if (result.response.status === 401 && retry && authenticated && session.refreshToken) {
    const next = await refreshAccessToken();
    result = await send(path, { method, body, headers, token: next.accessToken });
  }

  if (!result.response.ok) {
    throw new ApiError(result.payload.error || 'FoodMind could not complete that request.', result.response.status, result.payload.details);
  }
  return result.payload;
}

// <Image> source for an order's Mapbox map. The API draws it, so the Mapbox token stays on the server.
// "version" changes the URL (for example when the order status changes) so the picture is fetched again.
export function orderMapSource(orderId, version = '', { width = 600, height = 320 } = {}) {
  if (!session.accessToken || !orderId) return null;
  const query = `width=${width}&height=${height}${version ? `&v=${encodeURIComponent(version)}` : ''}`;
  return {
    uri: `${API_BASE_URL}/maps/orders/${encodeURIComponent(orderId)}?${query}`,
    headers: { Authorization: `Bearer ${session.accessToken}` },
  };
}

export const api = {
  auth: {
    login: body => apiRequest('/auth/login', { method: 'POST', body, authenticated: false, retry: false }),
    register: body => apiRequest('/auth/register', { method: 'POST', body, authenticated: false, retry: false }),
    me: () => apiRequest('/auth/me'),
    refresh: refreshToken => apiRequest('/auth/refresh', { method: 'POST', body: { refreshToken }, authenticated: false, retry: false }),
  },
  catalog: {
    restaurants: () => apiRequest('/restaurants'),
    restaurant: id => apiRequest(`/restaurants/${encodeURIComponent(id)}`),
    menu: id => apiRequest(`/restaurants/${encodeURIComponent(id)}/menu`),
    menuItem: id => apiRequest(`/menu-items/${encodeURIComponent(id)}`),
  },
  addresses: {
    list: () => apiRequest('/addresses'),
    create: body => apiRequest('/addresses', { method: 'POST', body }),
    update: (id, body) => apiRequest(`/addresses/${encodeURIComponent(id)}`, { method: 'PATCH', body }),
    remove: id => apiRequest(`/addresses/${encodeURIComponent(id)}`, { method: 'DELETE' }),
    makeDefault: id => apiRequest(`/addresses/${encodeURIComponent(id)}/default`, { method: 'POST' }),
    geocode: address => apiRequest('/addresses/geocode', { method: 'POST', body: { address } }),
    reverseGeocode: (lat, lng) => apiRequest('/addresses/reverse-geocode', { method: 'POST', body: { lat, lng } }),
  },
  orders: {
    list: () => apiRequest('/orders'),
    get: id => apiRequest(`/orders/${encodeURIComponent(id)}`),
    quote: body => apiRequest('/orders/quote', { method: 'POST', body }),
    create: body => apiRequest('/orders', { method: 'POST', body }),
    tracking: id => apiRequest(`/orders/${encodeURIComponent(id)}/tracking`),
    cancel: id => apiRequest(`/orders/${encodeURIComponent(id)}/cancel`, { method: 'POST' }),
    review: (id, body) => apiRequest(`/orders/${encodeURIComponent(id)}/review`, { method: 'POST', body }),
  },
  partner: {
    dashboard: () => apiRequest('/partner/dashboard'),
    orders: () => apiRequest('/partner/orders'),
    order: id => apiRequest(`/partner/orders/${encodeURIComponent(id)}`),
    accept: (id, prepMinutes) => apiRequest(`/partner/orders/${encodeURIComponent(id)}/accept`, { method: 'POST', body: { prepMinutes } }),
    reject: (id, reason) => apiRequest(`/partner/orders/${encodeURIComponent(id)}/reject`, { method: 'POST', body: { reason } }),
    ready: id => apiRequest(`/partner/orders/${encodeURIComponent(id)}/ready`, { method: 'POST' }),
    delay: (id, minutes) => apiRequest(`/partner/orders/${encodeURIComponent(id)}/delay`, { method: 'POST', body: { minutes } }),
    availability: isAccepting => apiRequest('/partner/restaurant/availability', { method: 'PATCH', body: { isAccepting } }),
  },
  rider: {
    status: () => apiRequest('/rider/status'),
    setOnline: isOnline => apiRequest('/rider/online', { method: 'PATCH', body: { isOnline } }),
    location: body => apiRequest('/rider/location', { method: 'POST', body }),
    currentOffer: () => apiRequest('/rider/offers/current'),
    respondToOffer: (id, action) => apiRequest(`/rider/offers/${encodeURIComponent(id)}/respond`, { method: 'POST', body: { action } }),
    orders: () => apiRequest('/rider/orders'),
    activeOrder: () => apiRequest('/rider/orders/active'),
    order: id => apiRequest(`/rider/orders/${encodeURIComponent(id)}`),
    pickup: (id, code) => apiRequest(`/rider/orders/${encodeURIComponent(id)}/pickup`, { method: 'POST', body: { code } }),
    delivered: (id, proofPhotoUrl) => apiRequest(`/rider/orders/${encodeURIComponent(id)}/delivered`, { method: 'POST', body: { proofPhotoUrl } }),
    earnings: () => apiRequest('/rider/earnings'),
  },
};
