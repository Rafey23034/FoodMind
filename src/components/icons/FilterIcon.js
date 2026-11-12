import React from 'react';
import { Path, Svg } from 'react-native-svg';
import { COLORS } from '../../theme/colors';

// Original FoodMind Figma SVG path, converted to React Native JSX.
export default function FilterIcon({ size = 16, color }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 16 16" fill="none">
    <Path d="M2 2.66667C2 2.29872 2.29872 2 2.66667 2H13.3333C13.7013 2 14 2.29872 14 2.66667V4.39067C14 4.56746 13.9297 4.737 13.8047 4.862L9.52867 9.138C9.40363 9.263 9.33337 9.43254 9.33333 9.60933V11.3333L6.66667 14V9.60933C6.66663 9.43254 6.59637 9.263 6.47133 9.138L2.19533 4.862C2.0703 4.737 2.00004 4.56746 2 4.39067V2.66667V2.66667" stroke={color || COLORS.textSecondary} strokeWidth="1.46667" strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
}
