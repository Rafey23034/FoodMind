import React from 'react';
import { Path, Svg } from 'react-native-svg';
import { COLORS } from '../../theme/colors';

// Original FoodMind Figma SVG path, converted to React Native JSX.
export default function SearchIcon({ size = 20, color }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 20 20" fill="none">
    <Path d="M17.5 17.5L13.875 13.875M15.4167 9.58333C15.4167 12.8028 12.8028 15.4167 9.58333 15.4167C6.36383 15.4167 3.75 12.8028 3.75 9.58333C3.75 6.36383 6.36383 3.75 9.58333 3.75C12.8028 3.75 15.4167 6.36383 15.4167 9.58333L17.5 17.5" stroke={color || COLORS.primary} strokeWidth="1.83333" strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
}
