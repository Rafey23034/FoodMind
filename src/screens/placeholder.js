// temporary component in case intented is not built yet 
import React from 'react';
import { View } from 'react-native';
import Button from '../components/Button';
import { useSession } from '../state/hooks';
import { colors, spacing } from '../theme';

const box = { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.background, padding: spacing.xl };

const AppText = ({ children, size = 14, bold, muted, style }) => (
  <Text style={[{ fontSize: size, fontWeight: bold ? '700' : '400', color: muted ? colors.muted : colors.text }, style]}>{children}</Text>
);

export const makePlaceholder = (name) =>
  function Placeholder() {
    return (
      <View style={box}>
        <AppText size={22} bold>{name} Screen</AppText>
        <AppText muted>Not built yet</AppText>
      </View>
    );
  };

export function RolePlaceholder() {
  const { role, user, logout } = useSession();
  return (
    <View style={box}>
      <AppText size={22} bold>Logged in as {role}</AppText>
      <AppText muted>{user && user.email}</AppText>
      <View style={{ height: spacing.lg }} />
      <Button title="Logout" onPress={logout} />
    </View>
  );
}