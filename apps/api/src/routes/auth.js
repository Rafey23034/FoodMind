const express = require('express');
const { z } = require('zod');
const auth = require('../services/auth');
const { validate } = require('../middleware/validate');
const { authenticate, signAccess, signRefresh, verifyToken } = require('../middleware/auth');
const config = require('../config');
const { unauthorized } = require('../errors');

const router = express.Router();

const registerSchema = z.object({
  name: z.string().trim().min(2).max(120),
  email: z.string().trim().email().max(255),
  password: z.string().min(6).max(100),
  role: z.enum(['customer', 'partner', 'rider']).default('customer'),
  phone: z.string().trim().max(20).optional().nullable(),
  city: z.string().trim().max(60).optional(),
  vehicleType: z.enum(['motorbike', 'scooter', 'bicycle']).optional(),
  vehicleRegistration: z.string().trim().max(20).optional(),
});

const loginSchema = z.object({
  email: z.string().trim().email(),
  password: z.string().min(1),
});

function session(user) {
  return {
    accessToken: signAccess(user),
    refreshToken: signRefresh(user),
    user,
  };
}

router.post('/register', validate(registerSchema), async (req, res) => {
  const user = await auth.register(req.body);
  res.status(201).json(session(user));
});

router.post('/login', validate(loginSchema), async (req, res) => {
  const user = await auth.login(req.body);
  res.json(session(user));
});

router.post('/refresh', async (req, res) => {
  const token = req.body?.refreshToken;
  if (!token) throw unauthorized('A refresh token is required.');

  let payload;
  try {
    payload = verifyToken(token, config.jwt.refreshSecret);
  } catch {
    throw unauthorized('Your session has expired. Sign in again.');
  }

  const user = await auth.refresh(Number(payload.sub));
  res.json(session(user));
});

router.get('/me', authenticate, async (req, res) => {
  const user = await auth.userDetails(req.user.id);
  if (!user) throw unauthorized();
  res.json({ user });
});

module.exports = router;
