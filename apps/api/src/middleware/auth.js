const jwt = require('jsonwebtoken');
const config = require('../config');
const { unauthorized, forbidden } = require('../errors');

const ACCESS_TYPE = 'access';
const REFRESH_TYPE = 'refresh';

function publicUser(user) {
  return {
    id: user.id ?? user.sub,
    name: user.full_name ?? user.name,
    email: user.email,
    role: user.role,
    phone: user.phone || null,
    avatarUrl: user.avatar_url || null,
  };
}

function signAccess(user) {
  return jwt.sign(
    { sub: String(user.id ?? user.sub), role: user.role, name: user.full_name ?? user.name, email: user.email, type: ACCESS_TYPE },
    config.jwt.accessSecret,
    { expiresIn: config.jwt.accessTtl }
  );
}

function signRefresh(user) {
  return jwt.sign(
    { sub: String(user.id ?? user.sub), role: user.role, type: REFRESH_TYPE },
    config.jwt.refreshSecret,
    { expiresIn: config.jwt.refreshTtl }
  );
}

function verifyToken(token, secret) {
  return jwt.verify(token, secret);
}

function authenticate(req, res, next) {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : '';
  if (!token) return next(unauthorized());

  try {
    const payload = verifyToken(token, config.jwt.accessSecret);
    if (payload.type !== ACCESS_TYPE) return next(unauthorized('Invalid access token.'));
    req.user = { id: Number(payload.sub), role: payload.role, name: payload.name, email: payload.email };
    return next();
  } catch {
    return next(unauthorized('Your session has expired.'));
  }
}

function requireRole(...roles) {
  return (req, res, next) => {
    if (!req.user) return next(unauthorized());
    if (!roles.includes(req.user.role)) return next(forbidden());
    return next();
  };
}

module.exports = {
  ACCESS_TYPE,
  publicUser,
  signAccess,
  signRefresh,
  verifyToken,
  authenticate,
  requireRole,
};
