const number = (value, fallback) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};

module.exports = {
  port: number(process.env.PORT, 3001),
  db: {
    host: process.env.DB_HOST || '127.0.0.1',
    port: number(process.env.DB_PORT, 3306),
    user: process.env.DB_USER || 'foodmind',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'foodmind',
  },
  jwt: {
    accessSecret: process.env.JWT_ACCESS_SECRET || 'foodmind-dev-access-secret',
    refreshSecret: process.env.JWT_REFRESH_SECRET || 'foodmind-dev-refresh-secret',
    accessTtl: '15m',
    refreshTtl: '30d',
  },
  google: {
    serverKey: process.env.GOOGLE_MAPS_SERVER_API_KEY || '',
    language: process.env.GOOGLE_MAPS_LANGUAGE || 'en',
    region: process.env.GOOGLE_MAPS_REGION || 'pk',
    defaultLat: number(process.env.DEFAULT_GEO_LAT, 31.5204),
    defaultLng: number(process.env.DEFAULT_GEO_LNG, 74.3587),
  },
  gemini: {
    apiKey: process.env.GEMINI_API_KEY || '',
    model: process.env.GEMINI_MODEL || 'gemini-3.5-flash',
  },
  platformFee: number(process.env.PLATFORM_FEE, 50),
  offer: {
    radiusM: number(process.env.OFFER_RADIUS_M, 5000),
    timeoutS: number(process.env.OFFER_TIMEOUT_S, 30),
  },
};
