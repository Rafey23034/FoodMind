import React, { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import AppButton from '../../components/AppButton';
import AppInput from '../../components/AppInput';
import AppText from '../../components/AppText';
import { COLORS } from '../../theme/colors';
import { SPACING, RADIUS } from '../../theme/spacing';
import { routes } from '../../navigation/routes';

export default function LoginScreen({ navigation, route, onLogin }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [errors, setErrors] = useState({});
  const [message, setMessage] = useState('');

  function handleLogin() {
    const nextErrors = {};
    if (!/^\S+@\S+\.\S+$/.test(email.trim())) nextErrors.email = 'Enter a valid email address.';
    if (password.length < 6) nextErrors.password = 'Password must contain at least 6 characters.';

    setErrors(nextErrors);
    setMessage('');
    if (Object.keys(nextErrors).length > 0) return;

    const success = onLogin(email.trim().toLowerCase(), password);
    if (!success) setMessage('Incorrect email or password.');
  }

  return (
    <SafeAreaView style={styles.screen}>
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <View style={styles.topRow}>
          <Pressable onPress={() => navigation.goBack()} style={styles.backButton}>
            <AppText style={styles.backArrow}>‹</AppText>
          </Pressable>
          <View style={styles.brandRow}>
            <View style={styles.brandIcon}>
              <AppText color={COLORS.white}>🍴</AppText>
            </View>
            <AppText style={styles.brandText}>FoodMind</AppText>
          </View>
        </View>

        <View style={styles.headingContainer}>
          <AppText variant="title">Welcome back</AppText>
          <AppText color={COLORS.textSecondary} style={styles.subtitle}>
            Sign in to satisfy your cravings and discover your personalized AI food profile.
          </AppText>
        </View>

        <View style={styles.form}>
          {route?.params?.registered ? (
            <AppText color={COLORS.success}>Account created! Sign in to continue.</AppText>
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
            <Pressable style={styles.showPassword} onPress={() => setShowPassword(!showPassword)}>
              <AppText variant="small" color={COLORS.primary}>
                {showPassword ? 'Hide' : 'Show'}
              </AppText>
            </Pressable>
          </View>

          <Pressable
            style={styles.forgotButton}
            onPress={() => setMessage('Password reset is not available in this demo.')}
          >
            <AppText variant="small" color={COLORS.primary}>Forgot password?</AppText>
          </Pressable>

          {message ? (
            <AppText variant="small" color={COLORS.danger} style={styles.message}>
              {message}
            </AppText>
          ) : null}

          <AppButton title="Sign In  →" onPress={handleLogin} style={styles.signInButton} testID="login-button" />

          <View style={styles.dividerRow}>
            <View style={styles.dividerLine} />
            <AppText variant="caption" color={COLORS.textSecondary} style={styles.dividerText}>
              OR CONTINUE WITH
            </AppText>
            <View style={styles.dividerLine} />
          </View>

          <View style={styles.socialRow}>
            <Pressable
              style={styles.socialButton}
              onPress={() => setMessage('Google sign-in is not connected yet.')}
            >
              <AppText style={styles.googleText}>G</AppText>
              <AppText>Google</AppText>
            </Pressable>
            <Pressable
              style={styles.socialButton}
              onPress={() => setMessage('Apple sign-in is not connected yet.')}
            >
              <AppText>●</AppText>
              <AppText>Apple</AppText>
            </Pressable>
          </View>

          <AppText variant="caption" color={COLORS.textSecondary} style={styles.demoHint}>
            Demo login: demo@food.com / 123456
          </AppText>
        </View>

        <View style={styles.footer}>
          <AppText variant="small" color={COLORS.textSecondary}>New to FoodMind? </AppText>
          <Pressable onPress={() => navigation.navigate(routes.REGISTER)}>
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
  backButton: { width: 36, height: 36, borderRadius: RADIUS.pill, backgroundColor: COLORS.white, alignItems: 'center', justifyContent: 'center' },
  backArrow: { fontSize: 30, lineHeight: 34 },
  brandRow: { flexDirection: 'row', alignItems: 'center' },
  brandIcon: { width: 30, height: 30, borderRadius: RADIUS.sm, backgroundColor: COLORS.primary, justifyContent: 'center', alignItems: 'center', marginRight: SPACING.sm },
  brandText: { fontWeight: '700', fontSize: 16 },
  headingContainer: { marginBottom: SPACING.xl },
  subtitle: { marginTop: SPACING.sm, lineHeight: 22 },
  form: { width: '100%' },
  passwordContainer: { position: 'relative' },
  showPassword: { position: 'absolute', right: SPACING.lg, top: 46, padding: SPACING.xs },
  forgotButton: { alignSelf: 'flex-end', marginBottom: SPACING.xl },
  message: { marginBottom: SPACING.md },
  signInButton: { minHeight: 55, borderRadius: RADIUS.md },
  dividerRow: { flexDirection: 'row', alignItems: 'center', marginVertical: SPACING.xl },
  dividerLine: { flex: 1, height: 1, backgroundColor: COLORS.border },
  dividerText: { marginHorizontal: SPACING.md, letterSpacing: 1 },
  socialRow: { flexDirection: 'row', justifyContent: 'space-between' },
  socialButton: { width: '48%', height: 48, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: COLORS.white, borderWidth: 1, borderColor: COLORS.border, borderRadius: RADIUS.md, gap: SPACING.sm },
  googleText: { fontWeight: '700', color: COLORS.primary },
  demoHint: { textAlign: 'center', marginTop: SPACING.lg },
  footer: { marginTop: 'auto', paddingTop: SPACING.xxl, flexDirection: 'row', alignItems: 'center', justifyContent: 'center' },
  footerLink: { fontWeight: '700' },
});
