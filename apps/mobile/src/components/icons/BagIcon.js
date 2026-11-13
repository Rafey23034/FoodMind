import React from 'react';
import { Path, Svg } from 'react-native-svg';

// Original FoodMind Figma SVG path, converted to React Native JSX.
export default function BagIcon({ size = 20, color }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 20 20" fill="none">
    <Path d="M13.3333 9.16667V5.83333C13.3333 3.99362 11.8396 2.5 9.99992 2.5C8.1602 2.5 6.66659 3.99362 6.66659 5.83333V9.16667M4.16659 7.5H15.8333L16.6666 17.5H3.33325L4.16659 7.5L13.3333 9.16667" stroke={color || "white"} strokeOpacity="0.9" strokeWidth="1.83333" strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
}
