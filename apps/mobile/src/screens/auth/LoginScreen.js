import React, { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import AppButton from '../../components/AppButton';
import AppInput from '../../components/AppInput';
import AppText from '../../components/AppText';
import BackButton from '../../components/BackButton';
import Icon from '../../components/Icon';
import { COLORS } from '../../theme/colors';
import { SPACING, RADIUS } from '../../theme/spacing';
import { routes } from '../../navigation/routes';

export default function LoginScreen({ navigation, route, onLogin }) {
  const [email, setEmail] = useState(route?.params?.email || '');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [errors, setErrors] = useState({});
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);

  async function handleLogin() {
    if (busy) return;
    const nextErrors = {};
    if (!/^\S+@\S+\.\S+$/.test(email.trim())) nextErrors.email = 'Enter a valid email address.';
    if (password.length < 6) nextErrors.password = 'Password must contain at least 6 characters.';

    setErrors(nextErrors);
    setMessage('');
    if (Object.keys(nextErrors).length > 0) return;

    setBusy(true);
    try {
      const success = await onLogin(email.trim().toLowerCase(), password);
      if (!success) setMessage('Email or password is incorrect.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <SafeAreaView style={styles.screen}>
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <View style={styles.topRow}>
          <BackButton onPress={() => navigation.goBack()} />
          <View style={styles.brandRow}>
            <View style={styles.brandIcon}>
              <Icon name="utensils" size={14} color={COLORS.white} />
            </View>
            <AppText style={styles.brandText}>FoodMind</AppText>
          </View>
        </View>

        <View style={styles.headingContainer}>
          <AppText variant="title">Welcome back</AppText>
          <AppText color={COLORS.textSecondary} style={styles.subtitle}>
            Sign in to FoodMind to continue.
          </AppText>
        </View>

        <View style={styles.form}>
          {route?.params?.registered ? (
            <AppText color={COLORS.success} style={styles.message}>Account created! Enter your password to sign in.</AppText>
          ) : null}

          <AppInput
            label="EMAIL ADDRESS"
            placeholder="you@example.com"
            value={email}
            onChangeText={setEmail}
            keyboardType="email-address"
            autoCapitalize="none"
            autoCorrect={false}
            error={errors.email}
            testID="login-email"
          />

          <View style={styles.passwordContainer}>
            <AppInput
              label="PASSWORD"
              placeholder="Enter your password"
              value={password}
              onChangeText={setPassword}
              secureTextEntry={!showPassword}
              autoCapitalize="none"
              error={errors.password}
              testID="login-password"
            />
            <Pressable style={styles.showPassword} onPress={() => setShowPassword(!showPassword)} accessibilityRole="button" hitSlop={8}
              accessibilityLabel={showPassword ? 'Hide password' : 'Show password'}>
              <AppText variant="small" color={COLORS.primary} style={styles.footerLink}>
                {showPassword ? 'Hide' : 'Show'}
              </AppText>
            </Pressable>
          </View>

          {message ? (
            <AppText variant="small" color={COLORS.danger} style={styles.message}>
              {message}
            </AppText>
          ) : null}

          <AppButton title={busy ? 'Signing in…' : 'Sign In  →'} onPress={handleLogin} disabled={busy}
            style={styles.signInButton} testID="login-button" />
        </View>

        <View style={styles.footer}>
          <AppText variant="small" color={COLORS.textSecondary}>New to FoodMind? </AppText>
          <Pressable onPress={() => navigation.navigate(routes.REGISTER)} accessibilityRole="button" hitSlop={8}>
            <AppText variant="small" color={COLORS.primary} style={styles.footerLink}>
              Create account
            </AppText>
          </Pressable>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: COLORS.background },
  content: { flexGrow: 1, paddingHorizontal: SPACING.xl, paddingTop: SPACING.md, paddingBottom: SPACING.xl },
  topRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 48 },
  brandRow: { flexDirection: 'row', alignItems: 'center' },
  brandIcon: { width: 30, height: 30, borderRadius: RADIUS.sm, backgroundColor: COLORS.primary, justifyContent: 'center', alignItems: 'center', marginRight: SPACING.sm },
  brandText: { fontWeight: '700' },
  headingContainer: { marginBottom: SPACING.xl },
  subtitle: { marginTop: SPACING.sm, lineHeight: 22 },
  form: { width: '100%' },
  passwordContainer: { position: 'relative' },
  showPassword: { position: 'absolute', right: SPACING.lg, top: 46, padding: SPACING.xs },
  message: { marginBottom: SPACING.md },
  signInButton: { minHeight: 55, borderRadius: RADIUS.md },
  footer: { marginTop: 'auto', paddingTop: SPACING.xxl, flexDirection: 'row', alignItems: 'center', justifyContent: 'center' },
  footerLink: { fontWeight: '700' },
});
