const bcrypt = require('bcryptjs');
const db = require('../db');
const { unauthorized, conflict } = require('../errors');
const { publicUser } = require('../middleware/auth');

const USER_COLUMNS = 'id, role, full_name, email, phone, avatar_url, status, created_at';

async function findUserByEmail(email) {
  return db.one(`SELECT ${USER_COLUMNS}, password_hash FROM users WHERE email = ?`, [email]);
}

async function findUserById(id) {
  return db.one(`SELECT ${USER_COLUMNS} FROM users WHERE id = ?`, [id]);
}

async function userDetails(id) {
  const user = await findUserById(id);
  if (!user) return null;
  return withProfile(user);
}

async function withProfile(user) {
  const id = user.id;
  let profile = null;
  if (user.role === 'partner') {
    profile = await db.one(
      `SELECT p.user_id, r.id AS restaurant_id, r.name AS restaurant_name, r.status AS restaurant_status,
              r.is_accepting_orders
         FROM partners p LEFT JOIN restaurants r ON r.partner_id = p.user_id
        WHERE p.user_id = ? ORDER BY r.id LIMIT 1`,
      [id]
    );
  }
  if (user.role === 'rider') {
    profile = await db.one(
      `SELECT user_id, city, vehicle_type, vehicle_registration, status, is_online
         FROM riders WHERE user_id = ?`,
      [id]
    );
  }

  return {
    ...publicUser(user),
    profile: profile ? {
      ...profile,
      restaurantId: profile.restaurant_id ? String(profile.restaurant_id) : undefined,
      restaurantName: profile.restaurant_name || undefined,
      restaurantStatus: profile.restaurant_status || undefined,
      isAcceptingOrders: profile.is_accepting_orders == null ? undefined : Boolean(profile.is_accepting_orders),
      isOnline: profile.is_online == null ? undefined : Boolean(profile.is_online),
    } : null,
  };
}

async function register({ name, email, password, role = 'customer', phone, city, vehicleType, vehicleRegistration }) {
  const normalizedEmail = String(email).trim().toLowerCase();
  const existing = await findUserByEmail(normalizedEmail);
  if (existing) throw conflict('An account with this email already exists.');

  const hash = await bcrypt.hash(password, 10);
  const userId = await db.transaction(async connection => {
    const [result] = await connection.query(
      'INSERT INTO users (role, full_name, email, phone, password_hash) VALUES (?, ?, ?, ?, ?)',
      [role, name.trim(), normalizedEmail, phone || null, hash]
    );
    const id = result.insertId;

    if (role === 'partner') {
      await connection.query('INSERT INTO partners (user_id) VALUES (?)', [id]);
    } else if (role === 'rider') {
      await connection.query(
        `INSERT INTO riders (user_id, city, vehicle_type, vehicle_registration)
         VALUES (?, ?, ?, ?)`,
        [
          id,
          city || 'Lahore',
          ['motorbike', 'scooter', 'bicycle'].includes(vehicleType) ? vehicleType : 'motorbike',
          vehicleRegistration || `TMP-${id}`,
        ]
      );
    } else {
      await connection.query('INSERT INTO customers (user_id) VALUES (?)', [id]);
    }

    return id;
  });

  return userDetails(userId);
}

async function login({ email, password }) {
  const user = await findUserByEmail(String(email).trim().toLowerCase());
  if (!user || user.status !== 'active') throw unauthorized('Email or password is incorrect.');

  const matches = await bcrypt.compare(password, user.password_hash);
  if (!matches) throw unauthorized('Email or password is incorrect.');

  return withProfile(user);
}

async function refresh(userId) {
  const user = await findUserById(userId);
  if (!user || user.status !== 'active') throw unauthorized('Account is not available.');
  return withProfile(user);
}

module.exports = { register, login, refresh, userDetails };
