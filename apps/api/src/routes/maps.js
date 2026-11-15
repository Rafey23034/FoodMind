const express = require('express');
const { z } = require('zod');
const orders = require('../services/orders');
const { authenticate, requireRole } = require('../middleware/auth');
const { badRequest } = require('../errors');

const router = express.Router();
router.use(authenticate, requireRole('customer', 'partner', 'rider'));

const sizeSchema = z.object({
  width: z.coerce.number().int().min(100).max(1280).default(600),
  height: z.coerce.number().int().min(100).max(1280).default(300),
});

// GET /api/v1/maps/orders/:id?width=600&height=300 -> PNG from Mapbox Static Images.
// The app shows it with <Image>, so the Mapbox token never leaves the server.
router.get('/orders/:id', async (req, res) => {
  const size = sizeSchema.safeParse(req.query);
  if (!size.success) throw badRequest('Map width and height must be between 100 and 1280.');
  const image = await orders.mapImage(req.user, Number(req.params.id), size.data);
  if (!image) return res.status(404).json({ error: 'A map is not available for this order.' });
  res.set('Cache-Control', 'private, max-age=30');
  return res.type('png').send(image);
});

module.exports = router;
