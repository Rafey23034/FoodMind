const express = require('express');
const { z } = require('zod');
const riders = require('../services/riders');
const orders = require('../services/orders');
const { validate } = require('../middleware/validate');
const { authenticate, requireRole } = require('../middleware/auth');

const router = express.Router();
router.use(authenticate, requireRole('rider'));

const onlineSchema = z.object({ isOnline: z.boolean() });
const pingSchema = z.object({
  lat: z.coerce.number().min(-90).max(90),
  lng: z.coerce.number().min(-180).max(180),
  accuracyM: z.coerce.number().min(0).max(65535).optional(),
});
const respondSchema = z.object({ action: z.enum(['accept', 'decline']) });
const pickupSchema = z.object({ code: z.string().trim().min(1).max(10) });
const deliveredSchema = z.object({ proofPhotoUrl: z.string().trim().max(500).optional().nullable() });

router.get('/status', async (req, res) => {
  res.json({ rider: await riders.status(req.user.id) });
});

router.patch('/online', validate(onlineSchema), async (req, res) => {
  res.json({ rider: await riders.setOnline(req.user.id, req.body.isOnline) });
});

router.post('/location', validate(pingSchema), async (req, res) => {
  res.json({ rider: await riders.ping(req.user.id, req.body) });
});

router.get('/offers/current', async (req, res) => {
  res.json({ offer: await riders.currentOffer(req.user.id) });
});

router.post('/offers/:id/respond', validate(respondSchema), async (req, res) => {
  res.json(await riders.respond(req.user.id, Number(req.params.id), req.body.action));
});

router.get('/orders', async (req, res) => {
  res.json({ orders: await orders.listForRider(req.user.id) });
});

router.get('/orders/active', async (req, res) => {
  res.json({ order: await orders.activeForRider(req.user.id) });
});

router.get('/orders/:id', async (req, res) => {
  res.json({ order: await orders.orderWithAccess(Number(req.params.id), req.user) });
});

router.post('/orders/:id/pickup', validate(pickupSchema), async (req, res) => {
  res.json({ order: await orders.pickup(req.user, Number(req.params.id), req.body.code) });
});

router.post('/orders/:id/delivered', validate(deliveredSchema), async (req, res) => {
  res.json({ order: await orders.delivered(req.user, Number(req.params.id), req.body.proofPhotoUrl) });
});

router.get('/earnings', async (req, res) => {
  res.json(await riders.earnings(req.user.id));
});

module.exports = router;
