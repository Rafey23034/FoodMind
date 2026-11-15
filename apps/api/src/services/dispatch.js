const db = require('../db');
const config = require('../config');
const realtime = require('../realtime');
const { iso } = require('../utils/format');

let worker = null;

async function offerNext(orderId) {
  const rows = await db.query(
    'CALL offer_order_to_nearest_rider(?, ?, ?)',
    [orderId, config.offer.radiusM, config.offer.timeoutS]
  );
  const offer = Array.isArray(rows) ? rows[0] : null;
  if (!offer) return null;

  const order = await db.one('SELECT id, restaurant_id FROM orders WHERE id = ?', [orderId]);
  const payload = {
    offerId: String(offer.offer_id),
    orderId: String(orderId),
    restaurantId: order ? String(order.restaurant_id) : null,
    distanceM: Number(offer.distance_m),
    expiresAt: iso(offer.expires_at),
  };

  realtime.send(offer.rider_id, 'delivery.offer', payload);
  await realtime.notifyOrder(orderId, 'order.offer_sent', { status: 'offered' });
  return payload;
}

async function sweepExpiredOffers() {
  const expired = await db.query(
    `SELECT id, order_id FROM delivery_offers
      WHERE response = 'pending' AND expires_at <= NOW()`
  );
  if (!expired.length) return;

  await db.query(
    `UPDATE delivery_offers
        SET response = 'expired', responded_at = NOW()
      WHERE response = 'pending' AND expires_at <= NOW()`
  );

  const orderIds = [...new Set(expired.map(row => row.order_id))];
  for (const orderId of orderIds) {
    try {
      await offerNext(orderId);
    } catch (error) {
      if (error.sqlMessage !== 'Order is not waiting for a rider') {
        console.error('Offer sweep failed for order', orderId, error.message);
      }
    }
  }
}

function startOfferWorker() {
  if (worker) return worker;
  worker = setInterval(() => {
    sweepExpiredOffers().catch(error => console.error('Offer worker:', error.message));
  }, 5000);
  worker.unref();
  return worker;
}

function stopOfferWorker() {
  if (worker) clearInterval(worker);
  worker = null;
}

module.exports = { offerNext, sweepExpiredOffers, startOfferWorker, stopOfferWorker };
