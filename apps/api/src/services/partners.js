const db = require('../db');
const orders = require('./orders');
const dispatch = require('./dispatch');
const realtime = require('../realtime');
const { badRequest, notFound, forbidden, conflict } = require('../errors');

async function restaurantFor(partnerId) {
  return db.one(
    `SELECT r.id, r.name, r.description, r.phone, r.email, r.address_line, r.city,
            r.base_delivery_fee, r.avg_prep_minutes, r.status, r.is_accepting_orders,
            r.logo_url, r.cover_url
       FROM restaurants r
      WHERE r.partner_id = ?
      ORDER BY r.id LIMIT 1`,
    [partnerId]
  );
}

async function requireRestaurant(partnerId) {
  const restaurant = await restaurantFor(partnerId);
  if (!restaurant) throw notFound('No restaurant is linked to this partner account.');
  return restaurant;
}

async function dashboard(partnerId) {
  const restaurant = await requireRestaurant(partnerId);
  const stats = await db.one(
    `SELECT
       SUM(status = 'placed') AS new_orders,
       SUM(status IN ('placed','preparing','ready','picked_up')) AS active_orders,
       SUM(status = 'delivered' AND DATE(placed_at) = CURDATE()) AS delivered_today,
       COALESCE(SUM(CASE WHEN status = 'delivered' AND DATE(placed_at) = CURDATE() THEN total ELSE 0 END), 0) AS revenue_today
     FROM orders WHERE restaurant_id = ?`,
    [restaurant.id]
  );

  return {
    restaurant: {
      ...restaurant,
      id: String(restaurant.id),
      isAcceptingOrders: Boolean(restaurant.is_accepting_orders),
    },
    stats: {
      newOrders: Number(stats.new_orders || 0),
      activeOrders: Number(stats.active_orders || 0),
      deliveredToday: Number(stats.delivered_today || 0),
      revenueToday: Number(stats.revenue_today || 0),
    },
  };
}

async function setAccepting(partnerId, isAccepting) {
  const restaurant = await requireRestaurant(partnerId);
  if (isAccepting && restaurant.status !== 'active') throw conflict('This restaurant is not active yet.');
  await db.query(
    'UPDATE restaurants SET is_accepting_orders = ? WHERE id = ? AND partner_id = ?',
    [Boolean(isAccepting), restaurant.id, partnerId]
  );
  return { isAcceptingOrders: Boolean(isAccepting) };
}

async function ownedOrder(partnerId, orderId) {
  const order = await orders.findRow(orderId);
  if (!order) throw notFound('Order not found.');
  if (order.partner_id !== partnerId) throw forbidden('This order belongs to another restaurant.');
  return order;
}

async function accept(partnerId, orderId, prepMinutes) {
  const order = await ownedOrder(partnerId, orderId);
  if (order.status !== 'placed') throw conflict('This order has already been handled.');

  await db.transaction(async connection => {
    const [result] = await connection.query(
      `UPDATE orders SET status = 'preparing', prep_minutes = ?
        WHERE id = ? AND status = 'placed'`,
      [prepMinutes, orderId]
    );
    if (!result.affectedRows) throw conflict('This order has already been handled.');
  }, partnerId);

  await realtime.notifyOrder(orderId, 'order.status_changed', { status: 'preparing' });
  dispatch.offerNext(orderId).catch(error => console.error('Could not offer accepted order:', error.message));
  return orders.orderWithAccess(orderId, { id: partnerId, role: 'partner' });
}

async function reject(partnerId, orderId, reason) {
  const order = await ownedOrder(partnerId, orderId);
  if (order.status !== 'placed') throw conflict('This order has already been handled.');

  await db.transaction(async connection => {
    const [result] = await connection.query(
      `UPDATE orders SET status = 'rejected', rejection_reason = ?
        WHERE id = ? AND status = 'placed'`,
      [reason || null, orderId]
    );
    if (!result.affectedRows) throw conflict('This order has already been handled.');
  }, partnerId);

  await realtime.notifyOrder(orderId, 'order.status_changed', { status: 'rejected' });
  return orders.orderWithAccess(orderId, { id: partnerId, role: 'partner' });
}

async function ready(partnerId, orderId) {
  const order = await ownedOrder(partnerId, orderId);
  if (order.status !== 'preparing') throw conflict('Only a preparing order can be marked ready.');

  await db.transaction(async connection => {
    const [result] = await connection.query(
      `UPDATE orders SET status = 'ready' WHERE id = ? AND status = 'preparing'`,
      [orderId]
    );
    if (!result.affectedRows) throw conflict('This order is not preparing.');
  }, partnerId);

  await realtime.notifyOrder(orderId, 'order.status_changed', { status: 'ready' });
  if (!order.rider_id) dispatch.offerNext(orderId).catch(error => console.error('Could not offer ready order:', error.message));
  return orders.orderWithAccess(orderId, { id: partnerId, role: 'partner' });
}

async function delay(partnerId, orderId, minutes) {
  const order = await ownedOrder(partnerId, orderId);
  if (!['preparing', 'ready'].includes(order.status)) {
    throw conflict('Only a preparing or ready order can be delayed.');
  }
  if (!Number.isInteger(minutes) || minutes < 1 || minutes > 120) {
    throw badRequest('Delay must be between 1 and 120 minutes.');
  }

  await db.transaction(async connection => {
    const [result] = await connection.query(
      `UPDATE orders SET delay_minutes = delay_minutes + ?
        WHERE id = ? AND status IN ('preparing','ready')`,
      [minutes, orderId]
    );
    if (!result.affectedRows) throw conflict('Only a preparing or ready order can be delayed.');
  }, partnerId);

  await realtime.notifyOrder(orderId, 'order.delayed', { minutes });
  return orders.orderWithAccess(orderId, { id: partnerId, role: 'partner' });
}

module.exports = { dashboard, setAccepting, accept, reject, ready, delay };
