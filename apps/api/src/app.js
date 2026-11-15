const express = require('express');
const cors = require('cors');
const config = require('./config');
const db = require('./db');
const authRoutes = require('./routes/auth');
const catalogRoutes = require('./routes/catalog');
const addressRoutes = require('./routes/addresses');
const orderRoutes = require('./routes/orders');
const partnerRoutes = require('./routes/partner');
const riderRoutes = require('./routes/rider');
const aiRoutes = require('./routes/ai');
const mapRoutes = require('./routes/maps');
const { notFound, errorHandler } = require('./middleware/errors');

const app = express();

app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'PATCH', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'Idempotency-Key'],
}));
app.use(express.json({ limit: '1mb' }));

app.get('/', (req, res) => {
  res.json({ message: 'FoodMind API is running.', version: 'v1', model: config.gemini.model });
});

app.get(['/api/v1/health', '/health'], async (req, res) => {
  const database = await db.one('SELECT 1 AS ok');
  res.json({
    status: database?.ok === 1 ? 'ok' : 'degraded',
    database: database?.ok === 1 ? 'connected' : 'unavailable',
    time: new Date().toISOString(),
  });
});

app.use('/api/v1/auth', authRoutes);
app.use('/api/v1', catalogRoutes);
app.use('/api/v1/addresses', addressRoutes);
app.use('/api/v1/orders', orderRoutes);
app.use('/api/v1/partner', partnerRoutes);
app.use('/api/v1/rider', riderRoutes);
app.use('/api/v1/maps', mapRoutes);
app.use('/api/v1/ai', aiRoutes);
app.use('/api/ai', aiRoutes);

app.use(notFound);
app.use(errorHandler);

module.exports = app;
