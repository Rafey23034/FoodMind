import React from 'react';
import { Path, Svg } from 'react-native-svg';
import { COLORS } from '../../theme/colors';

// Original FoodMind Figma SVG path, converted to React Native JSX.
export default function SearchTabIcon({ size = 20, color }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 20 20" fill="none">
    <Path d="M17.5 17.5L12.5 12.5M14.1667 8.33333C14.1667 11.5528 11.5528 14.1667 8.33333 14.1667C5.11383 14.1667 2.5 11.5528 2.5 8.33333C2.5 5.11383 5.11383 2.5 8.33333 2.5C11.5528 2.5 14.1667 5.11383 14.1667 8.33333L17.5 17.5" stroke={color || COLORS.textSecondary} strokeWidth="1.83333" strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
}
