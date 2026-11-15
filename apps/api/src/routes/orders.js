const express = require('express');
const { z } = require('zod');
const orders = require('../services/orders');
const { validate } = require('../middleware/validate');
const { authenticate, requireRole } = require('../middleware/auth');

const router = express.Router();
router.use(authenticate, requireRole('customer'));

const itemSchema = z.object({
  menuItemId: z.coerce.number().int().positive().optional(),
  dishId: z.coerce.number().int().positive().optional(),
  id: z.coerce.number().int().positive().optional(),
  quantity: z.coerce.number().int().min(1).max(99).default(1),
  optionIds: z.array(z.coerce.number().int().positive()).optional(),
}).refine(item => item.menuItemId || item.dishId || item.id, 'Each item needs a menu item id.');

const quoteSchema = z.object({
  restaurantId: z.coerce.number().int().positive(),
  items: z.array(itemSchema).min(1),
});

const createSchema = quoteSchema.extend({
  addressId: z.coerce.number().int().positive(),
  note: z.string().trim().max(300).optional().nullable(),
  idempotencyKey: z.string().trim().max(100).optional(),
});

const reviewSchema = z.object({
  restaurantRating: z.coerce.number().int().min(1).max(5),
  riderRating: z.coerce.number().int().min(1).max(5).optional().nullable(),
  comment: z.string().trim().max(1000).optional().nullable(),
});

router.post('/quote', validate(quoteSchema), async (req, res) => {
  res.json({ quote: await orders.quote(req.body.restaurantId, req.body.items) });
});

router.post('/', validate(createSchema), async (req, res) => {
  const body = {
    ...req.body,
    idempotencyKey: req.body.idempotencyKey || req.get('Idempotency-Key'),
  };
  res.status(201).json({ order: await orders.create(req.user, body) });
});

router.get('/', async (req, res) => {
  res.json({ orders: await orders.listForCustomer(req.user.id) });
});

router.get('/:id', async (req, res) => {
  res.json({ order: await orders.orderWithAccess(Number(req.params.id), req.user) });
});

router.get('/:id/tracking', async (req, res) => {
  const result = await orders.tracking(req.user, Number(req.params.id));
  const { route, eta, estimatedDeliveryAt, ...order } = result;
  res.json({ order, route, eta, estimatedDeliveryAt });
});

router.post('/:id/cancel', async (req, res) => {
  res.json({ order: await orders.cancel(req.user, Number(req.params.id)) });
});

router.post('/:id/review', validate(reviewSchema), async (req, res) => {
  res.status(201).json({ order: await orders.review(req.user, Number(req.params.id), req.body) });
});

module.exports = router;
