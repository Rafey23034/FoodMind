const EARTH_RADIUS_M = 6371000;

function radians(value) {
  return (value * Math.PI) / 180;
}

function distanceMeters(a, b) {
  const dLat = radians(b.lat - a.lat);
  const dLng = radians(b.lng - a.lng);
  const lat1 = radians(a.lat);
  const lat2 = radians(b.lat);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
  return Math.round(2 * EARTH_RADIUS_M * Math.asin(Math.sqrt(h)));
}

function pointText(lat, lng) {
  return `POINT(${Number(lng)} ${Number(lat)})`;
}

module.exports = { distanceMeters, pointText };
