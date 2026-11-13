import React from 'react';
import { Path, Svg } from 'react-native-svg';
import { COLORS } from '../../theme/colors';

// Original FoodMind Figma SVG path, converted to React Native JSX.
export default function MinusIcon({ size = 14, color }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 14 14" fill="none">
    <Path d="M11.6666 7H2.33325" stroke={color || COLORS.text} strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
}
