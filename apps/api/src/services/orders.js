const db = require('../db');
const config = require('../config');
const maps = require('./maps');
const realtime = require('../realtime');
const { pointText } = require('../utils/geo');
const { order: serializeOrder, orderItem, location, number } = require('../utils/format');
const { badRequest, notFound, forbidden, conflict } = require('../errors');

const ORDER_SELECT = `
  SELECT o.*, r.name AS restaurant_name, r.phone AS restaurant_phone, r.partner_id,
         ST_Latitude(r.location) AS restaurant_lat, ST_Longitude(r.location) AS restaurant_lng,
         ST_Latitude(o.delivery_location) AS delivery_lat, ST_Longitude(o.delivery_location) AS delivery_lng,
         u.full_name AS customer_name, u.email AS customer_email, u.phone AS customer_phone,
         ru.full_name AS rider_name, ru.phone AS rider_phone, rr.vehicle_type AS rider_vehicle,
          ST_Latitude(rl.location) AS rider_lat, ST_Longitude(rl.location) AS rider_lng
    FROM orders o
    JOIN restaurants r ON r.id = o.restaurant_id
    JOIN users u ON u.id = o.customer_id
    LEFT JOIN riders rr ON rr.user_id = o.rider_id
    LEFT JOIN users ru ON ru.id = o.rider_id
    LEFT JOIN rider_locations rl ON rl.rider_id = o.rider_id
`;

const idempotency = new Map();

async function itemsForOrders(orders) {
  if (!orders.length) return new Map();
  const ids = orders.map(row => row.id);
  const rows = await db.query(
    `SELECT oi.*, oio.option_id, oio.option_name, oio.price_delta
       FROM order_items oi
       LEFT JOIN order_item_options oio ON oio.order_item_id = oi.id
      WHERE oi.order_id IN (?)
      ORDER BY oi.id`,
    [ids]
  );

  const grouped = new Map();
  for (const row of rows) {
    if (!grouped.has(row.order_id)) grouped.set(row.order_id, new Map());
    const lines = grouped.get(row.order_id);
    if (!lines.has(row.id)) lines.set(row.id, orderItem(row));
    if (row.option_id) {
      lines.get(row.id).options.push({
        id: String(row.option_id),
        name: row.option_name,
        priceDelta: number(row.price_delta),
      });
    }
  }

  return new Map([...grouped.entries()].map(([orderId, lines]) => [orderId, [...lines.values()]]));
}

async function hydrateRows(rows) {
  const items = await itemsForOrders(rows);
  return rows.map(row => serializeOrder(row, items.get(row.id) || []));
}

async function listForCustomer(customerId) {
  const rows = await db.query(
    `${ORDER_SELECT} WHERE o.customer_id = ? ORDER BY o.placed_at DESC LIMIT 50`,
    [customerId]
  );
  return hydrateRows(rows);
}

async function listForPartner(partnerId) {
  const rows = await db.query(
    `${ORDER_SELECT} WHERE r.partner_id = ? ORDER BY o.placed_at DESC LIMIT 50`,
    [partnerId]
  );
  return hydrateRows(rows);
}

async function listForRider(riderId) {
  const rows = await db.query(
    `${ORDER_SELECT} WHERE o.rider_id = ? ORDER BY o.placed_at DESC LIMIT 50`,
    [riderId]
  );
  return hydrateRows(rows);
}

async function findRow(orderId) {
  return db.one(`${ORDER_SELECT} WHERE o.id = ?`, [orderId]);
}

function assertAccess(row, user) {
  if (!row) throw notFound('Order not found.');

  const allowed =
    (user.role === 'customer' && row.customer_id === user.id) ||
    (user.role === 'partner' && row.partner_id === user.id) ||
    (user.role === 'rider' && row.rider_id === user.id);

  if (!allowed) throw forbidden('You cannot view this order.');
}

async function orderWithAccess(orderId, user) {
  const row = await findRow(orderId);
  assertAccess(row, user);
  const [order] = await hydrateRows([row]);
  return order;
}

async function buildQuote(executor, restaurantId, items) {
  if (!Array.isArray(items) || !items.length) throw badRequest('Your cart is empty.');

  const normalized = items.map(item => ({
    menuItemId: Number(item.menuItemId ?? item.dishId ?? item.id),
    quantity: Math.max(1, Math.min(99, Number(item.quantity) || 1)),
    optionIds: Array.isArray(item.optionIds) ? item.optionIds.map(Number) : [],
  }));

  if (normalized.some(item => !Number.isInteger(item.menuItemId))) {
    throw badRequest('Every cart item needs a valid menu item id.');
  }

  const [restaurant] = await executor.query(
    `SELECT id, name, base_delivery_fee, status, is_accepting_orders
       FROM restaurants WHERE id = ?`,
    [restaurantId]
  );
  const venue = restaurant[0];
  if (!venue || venue.status !== 'active') throw badRequest('This restaurant is not available.');
  if (!venue.is_accepting_orders) throw conflict('This restaurant is not accepting orders right now.');

  const ids = [...new Set(normalized.map(item => item.menuItemId))];
  const [menuRows] = await executor.query(
    `SELECT id, name, price, restaurant_id, is_available, deleted_at
       FROM menu_items WHERE id IN (?)`,
    [ids]
  );
  const menu = new Map(menuRows.map(row => [row.id, row]));

  const optionIds = [...new Set(normalized.flatMap(item => item.optionIds))];
  const [optionRows] = optionIds.length
    ? await executor.query(
        `SELECT id, menu_item_id, name, price_delta, is_available FROM options WHERE id IN (?)`,
        [optionIds]
      )
    : [[]];
  const options = new Map(optionRows.map(row => [row.id, row]));

  const lines = normalized.map(item => {
    const dish = menu.get(item.menuItemId);
    if (!dish || dish.restaurant_id !== Number(restaurantId) || dish.deleted_at || !dish.is_available) {
      throw badRequest('Some items are no longer available. Refresh your cart.');
    }

    const chosen = item.optionIds.map(id => options.get(id)).filter(Boolean);
    if (chosen.length !== item.optionIds.length || chosen.some(option => option.menu_item_id !== dish.id || !option.is_available)) {
      throw badRequest('One or more add-ons are unavailable.');
    }

    const unitPrice = number(dish.price);
    const optionsPrice = chosen.reduce((sum, option) => sum + number(option.price_delta), 0);
    return {
      menuItemId: dish.id,
      name: dish.name,
      quantity: item.quantity,
      unitPrice,
      optionsPrice,
      lineTotal: (unitPrice + optionsPrice) * item.quantity,
      options: chosen.map(option => ({
        id: option.id,
        name: option.name,
        priceDelta: number(option.price_delta),
      })),
    };
  });

  const subtotal = lines.reduce((sum, line) => sum + line.lineTotal, 0);
  const deliveryFee = number(venue.base_delivery_fee);
  const platformFee = config.platformFee;

  return {
    restaurantId: String(venue.id),
    restaurantName: venue.name,
    lines,
    subtotal,
    deliveryFee,
    platformFee,
    discountAmount: 0,
    total: subtotal + deliveryFee + platformFee,
  };
}

async function quote(restaurantId, items) {
  return buildQuote(db.pool, restaurantId, items);
}

async function create(user, input) {
  const key = input.idempotencyKey ? `${user.id}:${input.idempotencyKey}` : null;
  if (key && idempotency.has(key)) {
    return orderWithAccess(idempotency.get(key), user);
  }

  const address = await db.one(
    `SELECT id, label, street, area, city, is_default,
            ST_Latitude(location) AS lat, ST_Longitude(location) AS lng
       FROM addresses
      WHERE id = ? AND customer_id = ? AND deleted_at IS NULL`,
    [input.addressId, user.id]
  );
  if (!address) throw badRequest('Choose a valid delivery address.');

  const restaurant = await db.one(
    `SELECT id, name, base_delivery_fee, status, is_accepting_orders,
            ST_Latitude(location) AS lat, ST_Longitude(location) AS lng
       FROM restaurants WHERE id = ?`,
    [input.restaurantId]
  );
  if (!restaurant) throw notFound('Restaurant not found.');

  const route = await maps.computeRoute(location(restaurant), location({ lat: address.lat, lng: address.lng }));

  const orderId = await db.transaction(async connection => {
    const priced = await buildQuote(connection, input.restaurantId, input.items);
    const fullAddress = [address.street, address.area, address.city].filter(Boolean).join(', ');

    const [result] = await connection.query(
      `INSERT INTO orders
        (customer_id, restaurant_id, address_id, delivery_label, delivery_address, delivery_location,
         delivery_distance_m, customer_note, subtotal, delivery_fee, platform_fee, total)
       VALUES (?, ?, ?, ?, ?, ST_GeomFromText(?, 4326, 'axis-order=long-lat'), ?, ?, ?, ?, ?, ?)`,
      [
        user.id,
        input.restaurantId,
        address.id,
        address.label,
        fullAddress,
        pointText(Number(address.lat), Number(address.lng)),
        route?.distanceM || null,
        input.note?.trim() || null,
        priced.subtotal,
        priced.deliveryFee,
        priced.platformFee,
        priced.total,
      ]
    );

    const orderId = result.insertId;
    for (const line of priced.lines) {
      const [itemResult] = await connection.query(
        `INSERT INTO order_items
          (order_id, restaurant_id, menu_item_id, item_name, unit_price, options_price, quantity)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [
          orderId,
          input.restaurantId,
          line.menuItemId,
          line.name,
          line.unitPrice,
          line.optionsPrice,
          line.quantity,
        ]
      );

      for (const option of line.options) {
        await connection.query(
          `INSERT INTO order_item_options
            (order_item_id, menu_item_id, option_id, option_name, price_delta)
           VALUES (?, ?, ?, ?, ?)`,
          [itemResult.insertId, line.menuItemId, option.id, option.name, option.priceDelta]
        );
      }
    }

    return orderId;
  }, user.id);

  if (key) idempotency.set(key, String(orderId));
  await realtime.notifyOrder(orderId, 'order.created', { status: 'placed' });
  return orderWithAccess(orderId, user);
}

async function cancel(user, orderId) {
  const row = await findRow(orderId);
  if (!row) throw notFound('Order not found.');
  if (row.customer_id !== user.id) throw forbidden();
  if (row.status !== 'placed') throw conflict('This order can no longer be cancelled.');

  await db.transaction(async connection => {
    const [result] = await connection.query(
      `UPDATE orders SET status = 'cancelled'
        WHERE id = ? AND customer_id = ? AND status = 'placed'`,
      [orderId, user.id]
    );
    if (!result.affectedRows) throw conflict('This order can no longer be cancelled.');
  }, user.id);

  await realtime.notifyOrder(orderId, 'order.status_changed', { status: 'cancelled' });
  return orderWithAccess(orderId, user);
}

async function tracking(user, orderId) {
  const row = await findRow(orderId);
  assertAccess(row, user);
  const [result] = await hydrateRows([row]);

  if (row.status === 'delivered' || row.status === 'cancelled' || row.status === 'rejected') {
    return {
      ...result,
      route: null,
      eta: null,
      estimatedDeliveryAt: row.status === 'delivered' ? result.updatedAt : null,
    };
  }

  const restaurantPoint = location({ lat: row.restaurant_lat, lng: row.restaurant_lng });
  const destination = location({ lat: row.delivery_lat, lng: row.delivery_lng });
  const riderPoint = location({ lat: row.rider_lat, lng: row.rider_lng });
  const origin = row.status === 'picked_up' && riderPoint ? riderPoint : restaurantPoint;
  const route = await maps.computeRoute(origin, destination);

  const now = Date.now();
  let base = now;
  if (row.status !== 'picked_up' && row.estimated_ready_at) {
    base = Math.max(now, new Date(`${row.estimated_ready_at.replace(' ', 'T')}Z`).getTime());
  }
  const estimatedDeliveryAt = route ? new Date(base + route.durationS * 1000).toISOString() : null;

  return {
    ...result,
    route,
    eta: route ? { durationS: route.durationS, estimatedDeliveryAt } : null,
    estimatedDeliveryAt,
  };
}

// One map for everyone on the order: restaurant, customer and, while delivering, the rider.
async function mapImage(user, orderId, size) {
  const row = await findRow(orderId);
  assertAccess(row, user);
  const restaurantPoint = location({ lat: row.restaurant_lat, lng: row.restaurant_lng });
  const destination = location({ lat: row.delivery_lat, lng: row.delivery_lng });
  const active = !['delivered', 'cancelled', 'rejected'].includes(row.status);
  const riderPoint = active && row.rider_id ? location({ lat: row.rider_lat, lng: row.rider_lng }) : null;
  const route = active ? await maps.computeRoute(restaurantPoint, destination) : null;
  const markers = [
    restaurantPoint && { ...restaurantPoint, icon: 'restaurant', color: 'fa542b' },
    destination && { ...destination, icon: 'home', color: '211b18' },
    riderPoint && { ...riderPoint, icon: 'bicycle', color: '239b66' },
  ].filter(Boolean);
  return maps.staticMap({ line: route?.coordinates || [], markers, ...size });
}

async function review(user, orderId, input) {
  const row = await findRow(orderId);
  if (!row) throw notFound('Order not found.');
  if (row.customer_id !== user.id) throw forbidden();
  if (row.status !== 'delivered') throw conflict('You can review an order after delivery.');

  try {
    await db.transaction(async connection => {
      await connection.query(
        `INSERT INTO order_reviews
          (order_id, customer_id, restaurant_id, restaurant_rating, rider_rating, comment)
         VALUES (?, ?, ?, ?, ?, ?)`,
        [
          orderId,
          user.id,
          row.restaurant_id,
          input.restaurantRating,
          input.riderRating ?? null,
          input.comment?.trim() || null,
        ]
      );
    }, user.id);
  } catch (error) {
    if (error.code === 'ER_DUP_ENTRY') throw conflict('This order has already been reviewed.');
    throw error;
  }

  return orderWithAccess(orderId, user);
}

async function activeForRider(riderId) {
  const rows = await db.query(
    `${ORDER_SELECT}
      WHERE o.rider_id = ? AND o.status IN ('preparing','ready','picked_up')
      ORDER BY o.updated_at DESC LIMIT 1`,
    [riderId]
  );
  const orders = await hydrateRows(rows);
  return orders[0] || null;
}

async function pickup(user, orderId, code) {
  const row = await findRow(orderId);
  if (!row) throw notFound('Order not found.');
  if (row.rider_id !== user.id) throw forbidden('This delivery is not assigned to you.');
  if (row.status !== 'ready') throw conflict('This order is not ready for pickup.');
  if (!row.pickup_code || String(row.pickup_code) !== String(code).trim()) {
    throw badRequest('The pickup code is incorrect.');
  }

  await db.transaction(async connection => {
    const [result] = await connection.query(
      `UPDATE orders SET status = 'picked_up'
        WHERE id = ? AND rider_id = ? AND status = 'ready'`,
      [orderId, user.id]
    );
    if (!result.affectedRows) throw conflict('This order can no longer be picked up.');
  }, user.id);

  await realtime.notifyOrder(orderId, 'order.status_changed', { status: 'picked_up' });
  return orderWithAccess(orderId, user);
}

async function delivered(user, orderId, proofPhotoUrl) {
  const row = await findRow(orderId);
  if (!row) throw notFound('Order not found.');
  if (row.rider_id !== user.id) throw forbidden('This delivery is not assigned to you.');
  if (row.status !== 'picked_up') throw conflict('This order has not been picked up.');

  await db.transaction(async connection => {
    const [result] = await connection.query(
      `UPDATE orders SET status = 'delivered', proof_photo_url = ?
        WHERE id = ? AND rider_id = ? AND status = 'picked_up'`,
      [proofPhotoUrl || null, orderId, user.id]
    );
    if (!result.affectedRows) throw conflict('This order can no longer be delivered.');
  }, user.id);

  await realtime.notifyOrder(orderId, 'order.status_changed', { status: 'delivered' });
  return orderWithAccess(orderId, user);
}

module.exports = {
  mapImage,
  listForCustomer,
  listForPartner,
  listForRider,
  orderWithAccess,
  quote,
  create,
  cancel,
  tracking,
  activeForRider,
  pickup,
  delivered,
  review,
  findRow,
};
