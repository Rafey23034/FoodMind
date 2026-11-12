import React from 'react';
import { StyleSheet, View } from 'react-native';
import Svg, { Circle, Path, Rect } from 'react-native-svg';
import AppText from '../AppText';
import { COLORS } from '../../theme/colors';
import { RADIUS } from '../../theme/spacing';

// An offline route illustration, deliberately independent of location APIs or a map key.
export default function DeliveryMap({ arrived = false, eta, community = false }) {
  const rider = arrived ? { x: 60, y: 233 } : { x: 173, y: 149 };
  const label = arrived ? 'Delivered' : eta || (community ? '12-16 min' : 'On the way');
  return <View style={styles.map}>
    <Svg width="100%" height="260" viewBox="0 0 360 280" accessibilityLabel="Illustrated delivery route">
      <Rect width="360" height="280" fill={COLORS.mapGround} />
      {[0, 1, 2].flatMap(x => [0, 1, 2].map(y => <Rect key={`${x}-${y}`} x={x * 120 + 7} y={y * 93 + 7} width="101" height="75" rx="8" fill={COLORS.mapBlock} />))}
      <Path d="M116 0V280 M237 0V280 M0 89H360 M0 183H360" stroke={COLORS.mapRoad} strokeWidth="13" />
      <Path d="M60 233C90 168 139 210 173 149S237 137 287 48" fill="none" stroke={COLORS.mapRouteGlow} strokeWidth="10" strokeLinecap="round" />
      <Path d="M60 233C90 168 139 210 173 149S237 137 287 48" fill="none" stroke={COLORS.primary} strokeWidth="4" strokeLinecap="round" />
      {/* Destination (home) and pickup (restaurant) pins */}
      <Circle cx="60" cy="233" r="16" fill={COLORS.white} stroke={COLORS.primary} strokeWidth="3" />
      <Circle cx="60" cy="233" r="5" fill={COLORS.primary} />
      <Circle cx="287" cy="48" r="16" fill={COLORS.primary} />
      <Circle cx="287" cy="48" r="5" fill={COLORS.white} />
      {/* Rider */}
      <Circle cx={rider.x} cy={rider.y} r="19" fill={COLORS.primary} stroke={COLORS.white} strokeWidth="4" />
    </Svg>
    <View style={styles.eta}>
      <AppText variant="caption" color={COLORS.textSecondary}>{arrived ? 'ARRIVED' : 'ESTIMATE'}</AppText>
      <AppText variant="small" style={styles.bold}>{label}</AppText>
    </View>
  </View>;
}
const styles = StyleSheet.create({
  map: { borderRadius: RADIUS.lg, overflow: 'hidden', backgroundColor: COLORS.mapGround },
  eta: { position: 'absolute', left: 13, top: 13, maxWidth: '62%', backgroundColor: COLORS.surface, borderRadius: RADIUS.md, padding: 12 },
  bold: { fontWeight: '700' },
});
