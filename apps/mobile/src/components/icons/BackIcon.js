import React from 'react';
import { Path, Svg } from 'react-native-svg';
import { COLORS } from '../../theme/colors';

// Original FoodMind Figma SVG path, converted to React Native JSX.
export default function BackIcon({ size = 20, color }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 20 20" fill="none">
    <Path d="M13.125 16.25L6.875 10L13.125 3.75" stroke={color || COLORS.text} strokeWidth="2.08333" strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
}
