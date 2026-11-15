const db = require('../db');
const { menuItem, number, location } = require('../utils/format');

const RESTAURANT_SELECT = `
  SELECT r.id, r.name, r.description, r.phone, r.email, r.address_line, r.city,
         r.base_delivery_fee, r.avg_prep_minutes, r.status, r.is_accepting_orders,
         r.logo_url, r.cover_url,
         ST_Latitude(r.location) AS lat, ST_Longitude(r.location) AS lng,
         COALESCE(rr.rating, 0) AS rating, COALESCE(rr.review_count, 0) AS review_count,
         GROUP_CONCAT(DISTINCT c.name ORDER BY c.name SEPARATOR ' • ') AS cuisines
    FROM restaurants r
    LEFT JOIN v_restaurant_ratings rr ON rr.restaurant_id = r.id
    LEFT JOIN restaurant_cuisines rc ON rc.restaurant_id = r.id
    LEFT JOIN cuisines c ON c.id = rc.cuisine_id
`;

function restaurant(row) {
  return {
    id: String(row.id),
    name: row.name,
    description: row.description || '',
    phone: row.phone,
    email: row.email,
    address: row.address_line,
    city: row.city,
    cuisine: row.cuisines || 'Food',
    rating: number(row.rating, 0),
    reviewCount: number(row.review_count, 0),
    deliveryFee: number(row.base_delivery_fee),
    avgPrepMinutes: number(row.avg_prep_minutes, 20),
    isOpen: Boolean(row.is_accepting_orders),
    location: location(row),
    logoUrl: row.logo_url || null,
    coverUrl: row.cover_url || null,
    symbol: '🍽️',
  };
}

async function listRestaurants() {
  const rows = await db.query(
    `${RESTAURANT_SELECT}
      WHERE r.status = 'active'
      GROUP BY r.id
      ORDER BY r.is_accepting_orders DESC, r.name`,
    []
  );
  return rows.map(restaurant);
}

async function getRestaurant(restaurantId) {
  const row = await db.one(
    `${RESTAURANT_SELECT}
      WHERE r.id = ? AND r.status = 'active'
      GROUP BY r.id`,
    [restaurantId]
  );
  return row ? restaurant(row) : null;
}

async function optionsFor(itemIds) {
  if (!itemIds.length) return new Map();
  const rows = await db.query(
    `SELECT id, menu_item_id, name, price_delta
       FROM options
      WHERE menu_item_id IN (?) AND is_available = TRUE
      ORDER BY id`,
    [itemIds]
  );
  const grouped = new Map();
  for (const row of rows) {
    if (!grouped.has(row.menu_item_id)) grouped.set(row.menu_item_id, []);
    grouped.get(row.menu_item_id).push({
      id: String(row.id),
      name: row.name,
      priceDelta: number(row.price_delta),
    });
  }
  return grouped;
}

async function menuFor(restaurantId) {
  const rows = await db.query(
    `SELECT v.*, GROUP_CONCAT(t.name ORDER BY t.name SEPARATOR ',') AS tags,
            ir.rating, ir.rating_count
       FROM v_menu_available v
       LEFT JOIN menu_item_tags mt ON mt.menu_item_id = v.id
       LEFT JOIN tags t ON t.id = mt.tag_id
       LEFT JOIN v_menu_item_ratings ir ON ir.menu_item_id = v.id
      WHERE v.restaurant_id = ?
      GROUP BY v.id
      ORDER BY v.category_name, v.is_recommended DESC, v.id`,
    [restaurantId]
  );
  const options = await optionsFor(rows.map(row => row.id));
  return rows.map(row => menuItem(row, options.get(row.id) || []));
}

async function getMenuItem(itemId) {
  const row = await db.one(
    `SELECT v.*, GROUP_CONCAT(t.name ORDER BY t.name SEPARATOR ',') AS tags,
            ir.rating, ir.rating_count
       FROM v_menu_available v
       LEFT JOIN menu_item_tags mt ON mt.menu_item_id = v.id
       LEFT JOIN tags t ON t.id = mt.tag_id
       LEFT JOIN v_menu_item_ratings ir ON ir.menu_item_id = v.id
      WHERE v.id = ?
      GROUP BY v.id`,
    [itemId]
  );
  if (!row) return null;
  const options = await optionsFor([row.id]);
  return menuItem(row, options.get(row.id) || []);
}

async function cuisines() {
  return db.query('SELECT id, name FROM cuisines ORDER BY name');
}

async function tags() {
  return db.query('SELECT id, name FROM tags ORDER BY name');
}

module.exports = { listRestaurants, getRestaurant, menuFor, getMenuItem, cuisines, tags };
