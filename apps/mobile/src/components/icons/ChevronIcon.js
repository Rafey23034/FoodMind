import React from 'react';
import { Path, Svg } from 'react-native-svg';
import { COLORS } from '../../theme/colors';

// Original FoodMind Figma SVG path, converted to React Native JSX.
export default function ChevronIcon({ size = 20, color }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 20 20" fill="none">
    <Path d="M7.5 4.16675L13.3333 10.0001L7.5 15.8334" stroke={color || COLORS.textSecondary} strokeWidth="1.66667" strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
}
