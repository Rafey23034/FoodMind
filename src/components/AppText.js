import React from 'react';
import { Text } from 'react-native';
import { COLORS } from '../theme/colors';
import { TYPOGRAPHY } from '../theme/typography';

export default function AppText({ children, variant = 'body', color = COLORS.text, style, ...props }) {
  return (
    <Text style={[TYPOGRAPHY[variant], { color }, style]} {...props}>
      {children}
    </Text>
  );
}
