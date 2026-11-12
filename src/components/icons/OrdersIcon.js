import React from 'react';
import { Path, Svg } from 'react-native-svg';
import { COLORS } from '../../theme/colors';

// Original FoodMind Figma SVG path, converted to React Native JSX.
export default function OrdersIcon({ size = 20, color }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 20 20" fill="none">
    <Path d="M7.49996 4.16667H5.83329C4.91282 4.16667 4.16663 4.91286 4.16663 5.83333V15.8333C4.16663 16.7538 4.91282 17.5 5.83329 17.5H14.1666C15.0871 17.5 15.8333 16.7538 15.8333 15.8333V5.83333C15.8333 4.91286 15.0871 4.16667 14.1666 4.16667H12.5M7.49996 4.16667C7.49996 5.08714 8.24615 5.83333 9.16663 5.83333H10.8333C11.7538 5.83333 12.5 5.08714 12.5 4.16667M7.49996 4.16667C7.49996 3.24619 8.24615 2.5 9.16663 2.5H10.8333C11.7538 2.5 12.5 3.24619 12.5 4.16667M9.99996 10H12.5M9.99996 13.3333H12.5M7.49996 10H7.50829M7.49996 13.3333H7.50829" stroke={color || COLORS.textSecondary} strokeWidth="1.83333" strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
}
