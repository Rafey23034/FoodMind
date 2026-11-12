import React from 'react';
import { Path, Svg } from 'react-native-svg';
import { COLORS } from '../../theme/colors';

// Original FoodMind Figma SVG path, converted to React Native JSX.
export default function SlidersIcon({ size = 20, color }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 20 20" fill="none">
    <Path d="M8.75 5H16.875M8.75 5C8.75 5.68989 8.18989 6.25 7.5 6.25C6.81011 6.25 6.25 5.68989 6.25 5M8.75 5C8.75 4.31011 8.18989 3.75 7.5 3.75C6.81011 3.75 6.25 4.31011 6.25 5M3.125 5H6.25M8.75 15H16.875M8.75 15C8.75 15.6899 8.18989 16.25 7.5 16.25C6.81011 16.25 6.25 15.6899 6.25 15M8.75 15C8.75 14.3101 8.18989 13.75 7.5 13.75C6.81011 13.75 6.25 14.3101 6.25 15M3.125 15H6.25M13.75 10H16.875M13.75 10C13.75 10.6899 13.1899 11.25 12.5 11.25C11.8101 11.25 11.25 10.6899 11.25 10M13.75 10C13.75 9.31011 13.1899 8.75 12.5 8.75C11.8101 8.75 11.25 9.31011 11.25 10M3.125 10H11.25" stroke={color || COLORS.text} strokeWidth="1.66667" strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
}
