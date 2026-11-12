import React from 'react';
import { Path, Svg } from 'react-native-svg';
import { COLORS } from '../../theme/colors';

// Original FoodMind Figma SVG path, converted to React Native JSX.
export default function PlusIcon({ size = 14, color }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 14 14" fill="none">
    <Path d="M6.99992 2.33325V11.6666M11.6666 6.99992H2.33325" stroke={color || COLORS.text} strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
}
