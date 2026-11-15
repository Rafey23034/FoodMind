const db = require('../db');
const maps = require('./maps');
const config = require('../config');
const { location } = require('../utils/format');
const { badRequest, notFound } = require('../errors');
const { pointText } = require('../utils/geo');

const addressText = input => [input.street, input.area, input.city].filter(Boolean).join(', ');

async function clearDefault(connection, customerId) {
  await connection.query(
    'UPDATE addresses SET is_default = FALSE WHERE customer_id = ? AND deleted_at IS NULL',
    [customerId]
  );
}

async function list(customerId) {
  const rows = await db.query(
    `SELECT id, label, street, area, city, is_default,
            ST_Latitude(location) AS lat, ST_Longitude(location) AS lng, created_at
       FROM addresses
      WHERE customer_id = ? AND deleted_at IS NULL
      ORDER BY is_default DESC, created_at DESC`,
    [customerId]
  );
  return rows.map(row => ({
    id: String(row.id),
    label: row.label,
    street: row.street,
    area: row.area || '',
    city: row.city,
    isDefault: Boolean(row.is_default),
    location: location(row),
  }));
}

async function find(customerId, addressId) {
  const row = await db.one(
    `SELECT id, label, street, area, city, is_default,
            ST_Latitude(location) AS lat, ST_Longitude(location) AS lng
       FROM addresses
      WHERE id = ? AND customer_id = ? AND deleted_at IS NULL`,
    [addressId, customerId]
  );
  return row;
}

async function create(customerId, input) {
  const geo = input.lat != null && input.lng != null
    ? { lat: Number(input.lat), lng: Number(input.lng) }
    : await maps.geocode(addressText(input)) || (config.mapbox.accessToken ? null : { lat: config.mapbox.defaultLat, lng: config.mapbox.defaultLng });

  if (!geo) {
    throw badRequest('We could not locate that address. Add latitude and longitude or configure Mapbox geocoding.');
  }

  return db.transaction(async connection => {
    const [[{ total }]] = await connection.query(
      'SELECT COUNT(*) AS total FROM addresses WHERE customer_id = ? AND deleted_at IS NULL',
      [customerId]
    );
    const isDefault = Boolean(input.isDefault) || Number(total) === 0;

    if (isDefault) await clearDefault(connection, customerId);

    const [result] = await connection.query(
      `INSERT INTO addresses (customer_id, label, street, area, city, location, is_default)
       VALUES (?, ?, ?, ?, ?, ST_GeomFromText(?, 4326, 'axis-order=long-lat'), ?)`,
      [
        customerId,
        input.label.trim(),
        input.street.trim(),
        input.area?.trim() || null,
        input.city.trim(),
        pointText(geo.lat, geo.lng),
        isDefault,
      ]
    );

    return { id: String(result.insertId), lat: geo.lat, lng: geo.lng, isDefault };
  });
}

async function update(customerId, addressId, input) {
  const existing = await find(customerId, addressId);
  if (!existing) throw notFound('Address not found.');

  const updated = { ...existing, ...input };
  const addressChanged = ['street', 'area', 'city'].some(field =>
    input[field] !== undefined && input[field] !== existing[field]);
  const geo = input.lat != null || input.lng != null
    ? { lat: Number(updated.lat), lng: Number(updated.lng) }
    : addressChanged ? await maps.geocode(addressText(updated)) : null;

  return db.transaction(async connection => {
    if (input.isDefault) await clearDefault(connection, customerId);

    await connection.query(
      `UPDATE addresses
          SET label = ?, street = ?, area = ?, city = ?,
              location = ST_GeomFromText(?, 4326, 'axis-order=long-lat'),
              is_default = ?
        WHERE id = ? AND customer_id = ?`,
      [
        updated.label.trim(),
        updated.street.trim(),
        updated.area?.trim() || null,
        updated.city.trim(),
        pointText(geo?.lat ?? Number(existing.lat), geo?.lng ?? Number(existing.lng)),
        input.isDefault == null ? Boolean(existing.is_default) : Boolean(input.isDefault),
        addressId,
        customerId,
      ]
    );

    return { id: String(addressId) };
  });
}

async function remove(customerId, addressId) {
  const existing = await find(customerId, addressId);
  if (!existing) throw notFound('Address not found.');

  await db.transaction(async connection => {
    await connection.query(
      'UPDATE addresses SET deleted_at = NOW(), is_default = FALSE WHERE id = ? AND customer_id = ?',
      [addressId, customerId]
    );
    if (existing.is_default) {
      const next = await connection.query(
        `SELECT id FROM addresses
          WHERE customer_id = ? AND deleted_at IS NULL
          ORDER BY created_at DESC LIMIT 1`,
        [customerId]
      );
      if (next[0]?.[0]) {
        await connection.query('UPDATE addresses SET is_default = TRUE WHERE id = ?', [next[0][0].id]);
      }
    }
  });

  return { id: String(addressId) };
}

async function makeDefault(customerId, addressId) {
  const existing = await find(customerId, addressId);
  if (!existing) throw notFound('Address not found.');

  await db.transaction(async connection => {
    await clearDefault(connection, customerId);
    await connection.query(
      'UPDATE addresses SET is_default = TRUE WHERE id = ? AND customer_id = ?',
      [addressId, customerId]
    );
  });

  return { id: String(addressId) };
}

async function reverse(lat, lng) {
  return maps.reverseGeocode(lat, lng);
}

async function geocode(address) {
  const result = await maps.geocode(address);
  return result || { lat: config.mapbox.defaultLat, lng: config.mapbox.defaultLng, formattedAddress: null };
}

module.exports = { list, create, update, remove, makeDefault, reverse, geocode };
