import React, { useState } from 'react';
import { Image, StyleSheet, View } from 'react-native';
import Svg, { Circle, Path, Rect } from 'react-native-svg';
import AppText from '../AppText';
import { COLORS } from '../../theme/colors';
import { RADIUS } from '../../theme/spacing';

function routePoints(points) {
  const valid = (points || []).filter(point => Number.isFinite(Number(point?.lat)) && Number.isFinite(Number(point?.lng)));
  if (valid.length < 2) return null;
  const lats = valid.map(point => Number(point.lat));
  const lngs = valid.map(point => Number(point.lng));
  const minLat = Math.min(...lats); const maxLat = Math.max(...lats);
  const minLng = Math.min(...lngs); const maxLng = Math.max(...lngs);
  const latRange = maxLat - minLat || 0.001;
  const lngRange = maxLng - minLng || 0.001;
  const placed = valid.map(point => ({
    x: 32 + ((Number(point.lng) - minLng) / lngRange) * 296,
    y: 248 - ((Number(point.lat) - minLat) / latRange) * 218,
  }));
  return { placed, path: placed.map((point, index) => `${index ? 'L' : 'M'}${point.x.toFixed(1)} ${point.y.toFixed(1)}`).join(' ') };
}

// Shows the Mapbox map from the API when "mapSource" is given (see orderMapSource in services/api.js).
// Without it, or if the image fails to load, it falls back to an offline route illustration.
export default function DeliveryMap({ arrived = false, eta, points, mapSource, live = false }) {
  const [failedUri, setFailedUri] = useState(null);
  const showImage = Boolean(mapSource?.uri) && failedUri !== mapSource.uri;
  const fallback = { placed: [{ x: 287, y: 48 }, { x: 173, y: 149 }, { x: 60, y: 233 }], path: 'M287 48C237 137 237 137 173 149S139 210 60 233' };
  const route = routePoints(points) || fallback;
  const start = route.placed[0];
  const end = route.placed[route.placed.length - 1];
  const rider = arrived ? end : route.placed[Math.floor((route.placed.length - 1) * 0.55)];
  const label = arrived ? 'Delivered' : eta || 'On the way';
  return <View style={styles.map}>
    {showImage ? <Image source={mapSource} style={styles.image} resizeMode="cover" accessibilityLabel="Delivery route map" onError={() => setFailedUri(mapSource.uri)} /> : <Svg width="100%" height="260" viewBox="0 0 360 280" accessibilityLabel="Illustrated delivery route">
      <Rect width="360" height="280" fill={COLORS.mapGround} />
      {[0, 1, 2].flatMap(x => [0, 1, 2].map(y => <Rect key={`${x}-${y}`} x={x * 120 + 7} y={y * 93 + 7} width="101" height="75" rx="8" fill={COLORS.mapBlock} />))}
      <Path d="M116 0V280 M237 0V280 M0 89H360 M0 183H360" stroke={COLORS.mapRoad} strokeWidth="13" />
      <Path d={route.path} fill="none" stroke={COLORS.mapRouteGlow} strokeWidth="10" strokeLinecap="round" strokeLinejoin="round" />
      <Path d={route.path} fill="none" stroke={COLORS.primary} strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" />
      <Circle cx={end.x} cy={end.y} r="16" fill={COLORS.white} stroke={COLORS.primary} strokeWidth="3" />
      <Circle cx={end.x} cy={end.y} r="5" fill={COLORS.primary} />
      <Circle cx={start.x} cy={start.y} r="16" fill={COLORS.primary} />
      <Circle cx={start.x} cy={start.y} r="5" fill={COLORS.white} />
      <Circle cx={rider.x} cy={rider.y} r="19" fill={COLORS.primary} stroke={COLORS.white} strokeWidth="4" />
    </Svg>}
    {live ? <View style={styles.live}><AppText variant="caption" color={COLORS.success} style={styles.bold}>● Live</AppText></View> : null}
    <View style={styles.eta}>
      <AppText variant="caption" color={COLORS.textSecondary}>{arrived ? 'ARRIVED' : 'ESTIMATE'}</AppText>
      <AppText variant="small" style={styles.bold}>{label}</AppText>
    </View>
  </View>;
}
const styles = StyleSheet.create({
  map: { borderRadius: RADIUS.lg, overflow: 'hidden', backgroundColor: COLORS.mapGround },
  image: { width: '100%', height: 260 },
  live: { position: 'absolute', right: 13, top: 13, backgroundColor: COLORS.surface, borderRadius: RADIUS.pill, paddingHorizontal: 10, paddingVertical: 4 },
  eta: { position: 'absolute', left: 13, top: 13, maxWidth: '62%', backgroundColor: COLORS.surface, borderRadius: RADIUS.md, padding: 12 },
  bold: { fontWeight: '700' },
});
