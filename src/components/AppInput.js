import React from 'react';
import { StyleSheet, TextInput, View } from 'react-native';
import AppText from './AppText';
import { COLORS } from '../theme/colors';
import { RADIUS, SPACING } from '../theme/spacing';
import { TYPOGRAPHY } from '../theme/typography';

export default function AppInput({
  label,
  value,
  onChangeText,
  placeholder,
  error,
  secureTextEntry = false,
  multiline = false,
  style,
  ...props
}) {
  return (
    <View style={styles.container}>
      {label ? <AppText variant="small" style={styles.label}>{label}</AppText> : null}
      <TextInput
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={COLORS.textSecondary}
        secureTextEntry={secureTextEntry}
        multiline={multiline}
        style={[
          styles.input,
          multiline && styles.multiline,
          error && styles.errorBorder,
          style,
        ]}
        {...props}
      />
      {error ? <AppText variant="small" color={COLORS.danger}>{error}</AppText> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { marginBottom: SPACING.lg },
  label: { fontWeight: '600', marginBottom: SPACING.sm },
  input: {
    ...TYPOGRAPHY.body,
    color: COLORS.text,
    backgroundColor: COLORS.inputBackground,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: RADIUS.md,
    minHeight: 50,
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.md,
  },
  multiline: { minHeight: 100, textAlignVertical: 'top' },
  errorBorder: { borderColor: COLORS.danger },
});
