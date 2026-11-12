import React from 'react';
import { Path, Svg } from 'react-native-svg';
import { COLORS } from '../../theme/colors';

// Original FoodMind Figma SVG path, converted to React Native JSX.
export default function HeartIcon({ size = 20, color }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 20 20" fill="none">
    <Path d="M3.59837 5.26511C2.89509 5.96838 2.5 6.92221 2.5 7.91678C2.5 8.91135 2.89509 9.86518 3.59837 10.5684L10 16.9701L16.4017 10.5684C17.8652 9.10495 17.8652 6.72861 16.4017 5.26511C14.9382 3.80162 12.5619 3.80162 11.0984 5.26511L10 6.36345L8.9017 5.26511C8.19844 4.56184 7.2446 4.16675 6.25003 4.16675C5.25546 4.16675 4.30163 4.56184 3.59837 5.26511V5.26511" stroke={color || COLORS.text} strokeWidth="1.66667" strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
}
