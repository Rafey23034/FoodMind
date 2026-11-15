const express = require('express');
const { z } = require('zod');
const partners = require('../services/partners');
const orders = require('../services/orders');
const { validate } = require('../middleware/validate');
const { authenticate, requireRole } = require('../middleware/auth');

const router = express.Router();
router.use(authenticate, requireRole('partner'));

const acceptSchema = z.object({
  prepMinutes: z.coerce.number().int().min(5).max(180).default(20),
});

const rejectSchema = z.object({
  reason: z.string().trim().max(200).optional().nullable(),
});

const delaySchema = z.object({
  minutes: z.coerce.number().int().min(1).max(120),
});

const availabilitySchema = z.object({
  isAccepting: z.boolean(),
});

router.get('/dashboard', async (req, res) => {
  res.json(await partners.dashboard(req.user.id));
});

router.get('/orders', async (req, res) => {
  res.json({ orders: await orders.listForPartner(req.user.id) });
});

router.get('/orders/:id', async (req, res) => {
  res.json({ order: await orders.orderWithAccess(Number(req.params.id), req.user) });
});

router.post('/orders/:id/accept', validate(acceptSchema), async (req, res) => {
  res.json({ order: await partners.accept(req.user.id, Number(req.params.id), req.body.prepMinutes) });
});

router.post('/orders/:id/reject', validate(rejectSchema), async (req, res) => {
  res.json({ order: await partners.reject(req.user.id, Number(req.params.id), req.body.reason) });
});

router.post('/orders/:id/ready', async (req, res) => {
  res.json({ order: await partners.ready(req.user.id, Number(req.params.id)) });
});

router.post('/orders/:id/delay', validate(delaySchema), async (req, res) => {
  res.json({ order: await partners.delay(req.user.id, Number(req.params.id), req.body.minutes) });
});

router.patch('/restaurant/availability', validate(availabilitySchema), async (req, res) => {
  res.json(await partners.setAccepting(req.user.id, req.body.isAccepting));
});

module.exports = router;
