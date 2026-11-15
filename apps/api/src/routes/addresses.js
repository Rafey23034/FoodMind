const express = require('express');
const { z } = require('zod');
const addresses = require('../services/addresses');
const { validate } = require('../middleware/validate');
const { authenticate, requireRole } = require('../middleware/auth');

const router = express.Router();
router.use(authenticate, requireRole('customer'));

const addressSchema = z.object({
  label: z.string().trim().min(1).max(40),
  street: z.string().trim().min(3).max(255),
  area: z.string().trim().max(100).optional().nullable(),
  city: z.string().trim().min(2).max(60),
  lat: z.coerce.number().min(-90).max(90).optional(),
  lng: z.coerce.number().min(-180).max(180).optional(),
  isDefault: z.boolean().optional(),
});

const updateSchema = addressSchema.partial().refine(
  value => Object.keys(value).length > 0,
  'Provide at least one field.'
);

router.get('/', async (req, res) => {
  res.json({ addresses: await addresses.list(req.user.id) });
});

router.post('/geocode', async (req, res) => {
  res.json({ location: await addresses.geocode(req.body.address) });
});

router.post('/reverse-geocode', async (req, res) => {
  res.json({ location: await addresses.reverse(Number(req.body.lat), Number(req.body.lng)) });
});

router.post('/', validate(addressSchema), async (req, res) => {
  res.status(201).json({ address: await addresses.create(req.user.id, req.body) });
});

router.patch('/:id', validate(updateSchema), async (req, res) => {
  res.json({ address: await addresses.update(req.user.id, Number(req.params.id), req.body) });
});

router.delete('/:id', async (req, res) => {
  res.json(await addresses.remove(req.user.id, Number(req.params.id)));
});

router.post('/:id/default', async (req, res) => {
  res.json(await addresses.makeDefault(req.user.id, Number(req.params.id)));
});

module.exports = router;
