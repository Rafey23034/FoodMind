const db = require('../db');
const orders = require('./orders');
const dispatch = require('./dispatch');
const realtime = require('../realtime');
const { pointText } = require('../utils/geo');
const { iso, location, number } = require('../utils/format');
const { badRequest, notFound, forbidden, conflict } = require('../errors');

async function riderFor(riderId) {
  return db.one(
    `SELECT rd.user_id, rd.city, rd.vehicle_type, rd.vehicle_registration,
            rd.status, rd.is_online,
            ST_Latitude(rl.location) AS lat, ST_Longitude(rl.location) AS lng,
            rl.updated_at AS location_updated_at
       FROM riders rd
       LEFT JOIN rider_locations rl ON rl.rider_id = rd.user_id
      WHERE rd.user_id = ?`,
    [riderId]
  );
}

async function status(riderId) {
  const rider = await riderFor(riderId);
  if (!rider) throw notFound('Rider profile not found.');
  return {
    id: String(rider.user_id),
    city: rider.city,
    vehicleType: rider.vehicle_type,
    vehicleRegistration: rider.vehicle_registration,
    status: rider.status,
    isOnline: Boolean(rider.is_online),
    location: location(rider),
    locationUpdatedAt: iso(rider.location_updated_at),
  };
}

async function setOnline(riderId, isOnline) {
  const rider = await riderFor(riderId);
  if (!rider) throw notFound('Rider profile not found.');
  if (isOnline && rider.status !== 'active') {
    throw conflict('Your rider account is still being activated.');
  }

  await db.query('UPDATE riders SET is_online = ? WHERE user_id = ?', [Boolean(isOnline), riderId]);
  if (!isOnline) {
    await db.query(
      `UPDATE delivery_offers SET response = 'declined', responded_at = NOW()
        WHERE rider_id = ? AND response = 'pending'`,
      [riderId]
    );
  }

  return status(riderId);
}

async function ping(riderId, input) {
  const rider = await riderFor(riderId);
  if (!rider) throw notFound('Rider profile not found.');
  if (rider.status !== 'active') throw conflict('Your rider account is still being activated.');

  await db.transaction(async connection => {
    await connection.query(
      `INSERT INTO rider_locations (rider_id, location, accuracy_m, updated_at)
       VALUES (?, ST_GeomFromText(?, 4326, 'axis-order=long-lat'), ?, NOW())
       ON DUPLICATE KEY UPDATE location = VALUES(location), accuracy_m = VALUES(accuracy_m), updated_at = NOW()`,
      [riderId, pointText(input.lat, input.lng), input.accuracyM == null ? null : Number(input.accuracyM)]
    );
    await connection.query('UPDATE riders SET is_online = TRUE WHERE user_id = ?', [riderId]);
  });

  // While delivering, the customer and restaurant maps should show the rider's new position.
  const active = await db.one('SELECT id FROM orders WHERE active_rider_id = ?', [riderId]);
  if (active) await realtime.notifyOrder(active.id, 'order.rider_location', {}, { except: riderId });

  return status(riderId);
}

async function currentOffer(riderId) {
  const row = await db.one(
    `SELECT do2.id AS offer_id, do2.order_id, do2.distance_m, do2.expires_at, o.delivery_fee,
            r.name AS restaurant_name, r.address_line AS restaurant_address,
            ST_Latitude(r.location) AS restaurant_lat, ST_Longitude(r.location) AS restaurant_lng
       FROM delivery_offers do2
       JOIN orders o ON o.id = do2.order_id
       JOIN restaurants r ON r.id = o.restaurant_id
      WHERE do2.rider_id = ? AND do2.response = 'pending' AND do2.expires_at > NOW()
      ORDER BY do2.offered_at DESC LIMIT 1`,
    [riderId]
  );
  if (!row) return null;

  return {
    id: String(row.offer_id),
    orderId: String(row.order_id),
    distanceM: number(row.distance_m),
    deliveryFee: number(row.delivery_fee),
    expiresAt: iso(row.expires_at),
    restaurant: {
      name: row.restaurant_name,
      address: row.restaurant_address,
      location: location({ lat: row.restaurant_lat, lng: row.restaurant_lng }),
    },
  };
}

async function respond(riderId, offerId, action) {
  if (!['accept', 'decline'].includes(action)) throw badRequest('Choose accept or decline.');

  let orderId;
  await db.transaction(async connection => {
    const [rows] = await connection.query(
      `SELECT id, order_id, rider_id, response, expires_at
         FROM delivery_offers WHERE id = ? FOR UPDATE`,
      [offerId]
    );
    const offer = rows[0];
    if (!offer) throw notFound('Offer not found.');
    if (offer.rider_id !== riderId) throw forbidden('This offer is for another rider.');
    if (offer.response !== 'pending') throw conflict('This offer has already been answered.');
    if (new Date(`${offer.expires_at.replace(' ', 'T')}Z`) <= new Date()) {
      throw conflict('This offer has expired.');
    }

    orderId = offer.order_id;
    await connection.query(
      'UPDATE delivery_offers SET response = ? WHERE id = ? AND response = ?',
      [action === 'accept' ? 'accepted' : 'declined', offerId, 'pending']
    );
  }, riderId);

  if (action === 'accept') {
    await realtime.notifyOrder(orderId, 'order.rider_assigned', { riderId: String(riderId) });
    return { order: await orders.orderWithAccess(orderId, { id: riderId, role: 'rider' }) };
  }

  await realtime.notifyOrder(orderId, 'order.offer_declined', { riderId: String(riderId) });
  dispatch.offerNext(orderId).catch(error => {
    if (error.sqlMessage !== 'Order is not waiting for a rider') {
      console.error('Could not offer declined order:', error.message);
    }
  });
  return { orderId: String(orderId), declined: true };
}

async function earnings(riderId) {
  const row = await db.one(
    `SELECT deliveries, earnings FROM v_rider_daily_earnings
      WHERE rider_id = ? AND delivery_date = CURDATE()`,
    [riderId]
  );
  return {
    today: {
      deliveries: number(row?.deliveries, 0),
      earnings: number(row?.earnings, 0),
    },
  };
}

module.exports = { status, setOnline, ping, currentOffer, respond, earnings };
