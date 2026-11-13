import React from 'react';
import { Path, Svg } from 'react-native-svg';
import { COLORS } from '../../theme/colors';

// Original FoodMind Figma SVG path, converted to React Native JSX.
export default function ProfileIcon({ size = 20, color }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 20 20" fill="none">
    <Path d="M13.3333 5.83333C13.3333 7.67305 11.8397 9.16667 9.99996 9.16667C8.16024 9.16667 6.66663 7.67305 6.66663 5.83333C6.66663 3.99362 8.16024 2.5 9.99996 2.5C11.8397 2.5 13.3333 3.99362 13.3333 5.83333V5.83333M9.99996 11.6667C6.78045 11.6667 4.16663 14.2805 4.16663 17.5H15.8333C15.8333 14.2805 13.2195 11.6667 9.99996 11.6667V11.6667" stroke={color || COLORS.textSecondary} strokeWidth="1.83333" strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
}
