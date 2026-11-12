import React from 'react';
import { Path, Svg } from 'react-native-svg';
import { COLORS } from '../../theme/colors';

// Original FoodMind Figma SVG path, converted to React Native JSX.
export default function DownIcon({ size = 16, color }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 16 16" fill="none">
    <Path d="M12.6667 6L8.00004 10.6667L3.33337 6" stroke={color || COLORS.primary} strokeWidth="1.66667" strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
}
