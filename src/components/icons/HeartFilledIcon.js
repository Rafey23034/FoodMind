import React from 'react';
import { Path, Svg } from 'react-native-svg';
import { COLORS } from '../../theme/colors';

// Original FoodMind Figma SVG path, converted to React Native JSX.
export default function HeartFilledIcon({ size = 20, color }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 20 20" fill="none">
    <Path d="M10.0001 17.7917L8.79175 16.6917C4.50008 12.8 1.66675 10.2333 1.66675 7.08333C1.66675 4.51667 3.68341 2.5 6.25008 2.5C7.70008 2.5 9.09175 3.175 10.0001 4.24167C10.9084 3.175 12.3001 2.5 13.7501 2.5C16.3167 2.5 18.3334 4.51667 18.3334 7.08333C18.3334 10.2333 15.5001 12.8 11.2084 16.7L10.0001 17.7917Z" fill={color || COLORS.primary} />
    <Path d="M10.0001 17.7917L8.79175 16.6917C4.50008 12.8 1.66675 10.2333 1.66675 7.08333C1.66675 4.51667 3.68341 2.5 6.25008 2.5C7.70008 2.5 9.09175 3.175 10.0001 4.24167C10.9084 3.175 12.3001 2.5 13.7501 2.5C16.3167 2.5 18.3334 4.51667 18.3334 7.08333C18.3334 10.2333 15.5001 12.8 11.2084 16.7L10.0001 17.7917V17.7917" stroke={color || COLORS.primary} strokeWidth="0.833333" />
    </Svg>
  );
}
