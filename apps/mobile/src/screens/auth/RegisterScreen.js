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

export default function RegisterScreen({ navigation, route, onRegister }) {
  const role = ['partner', 'rider'].includes(route?.params?.role) ? route.params.role : 'customer';
  const isPartner = role === 'partner';
  const isRider = role === 'rider';
  const [form, setForm] = useState({ name: '', email: '', password: '', confirmPassword: '' });
  const [errors, setErrors] = useState({});
  const [message, setMessage] = useState('');
  const [showPasswords, setShowPasswords] = useState(false);

  const setField = key => value => setForm(previous => ({ ...previous, [key]: value }));

  function handleRegister() {
    const nextErrors = {};
    if (!form.name.trim()) nextErrors.name = 'Please enter your name.';
    if (!/^\S+@\S+\.\S+$/.test(form.email.trim())) nextErrors.email = 'Enter a valid email address.';
    if (form.password.length < 6) nextErrors.password = 'Password must contain at least 6 characters.';
    if (form.confirmPassword !== form.password) nextErrors.confirmPassword = 'Passwords do not match.';

    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) return;

    const result = onRegister({
      name: form.name.trim(),
      email: form.email.trim().toLowerCase(),
      password: form.password,
    }, role);
    if (!result.success) {
      setMessage(result.message);
      return;
    }
    // Both kinds of accounts sign in through the same Login screen.
    navigation.replace(routes.LOGIN, { registered: true, email: result.email || form.email.trim().toLowerCase() });
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
          <AppText variant="title">{isPartner ? 'Partner Registration' : isRider ? 'Create Rider Account' : 'Create an account'}</AppText>
          <AppText color={COLORS.textSecondary} style={styles.subtitle}>
            {isPartner ? 'Create a partner account to manage Urban Bites.' : isRider ? 'Get ready to deliver with FoodMind.'
              : 'Join FoodMind and discover food tailored to your taste, cravings and preferences.'}
          </AppText>
        </View>

        <View style={styles.form}>
          <AppInput
            label={isPartner ? 'PARTNER CONTACT NAME' : 'FULL NAME'}
            placeholder="Enter your full name"
            value={form.name}
            onChangeText={setField('name')}
            autoCapitalize="words"
            error={errors.name}
            testID="register-name"
          />

          <AppInput
            label="EMAIL ADDRESS"
            placeholder="you@example.com"
            value={form.email}
            onChangeText={setField('email')}
            keyboardType="email-address"
            autoCapitalize="none"
            autoCorrect={false}
            error={errors.email}
            testID="register-email"
          />

          <AppInput
            label="PASSWORD"
            placeholder="Create a password"
            value={form.password}
            onChangeText={setField('password')}
            secureTextEntry={!showPasswords}
            autoCapitalize="none"
            error={errors.password}
            testID="register-password"
          />

          <AppInput
            label="CONFIRM PASSWORD"
            placeholder="Re-enter your password"
            value={form.confirmPassword}
            onChangeText={setField('confirmPassword')}
            secureTextEntry={!showPasswords}
            autoCapitalize="none"
            error={errors.confirmPassword}
            testID="register-confirm-password"
          />

          <Pressable style={styles.showPasswordButton} onPress={() => setShowPasswords(!showPasswords)} accessibilityRole="button" hitSlop={8}>
            <AppText variant="small" color={COLORS.primary}>
              {showPasswords ? 'Hide passwords' : 'Show passwords'}
            </AppText>
          </Pressable>

          <AppText variant="caption" color={COLORS.textSecondary} style={styles.passwordHint}>
            Use at least 6 characters for your password.
          </AppText>

          {message ? <AppText color={COLORS.danger} style={styles.passwordHint}>{message}</AppText> : null}

          <AppButton
            title={isPartner ? 'Create Partner Account  →' : isRider ? 'Create Rider Account  →' : 'Create Account  →'}
            onPress={handleRegister}
            style={styles.registerButton}
            testID={isPartner ? 'partner-register-button' : 'register-button'}
          />
        </View>

        <View style={styles.footer}>
          <AppText variant="small" color={COLORS.textSecondary}>
            Already have an account?{' '}
          </AppText>
          <Pressable onPress={() => navigation.navigate(routes.LOGIN)} accessibilityRole="button" hitSlop={8}>
            <AppText variant="small" color={COLORS.primary} style={styles.footerLink}>
              Sign in
            </AppText>
          </Pressable>
        </View>
        {/* Offer the two roles the person is not currently registering as. */}
        {[['customer', 'Create a customer account instead'], ['partner', 'Register as a restaurant partner instead'], ['rider', 'Register as a rider instead']]
          .filter(([value]) => value !== role).map(([value, label]) => (
            <Pressable key={value} style={styles.switchRole} onPress={() => { setMessage(''); navigation.setParams({ role: value }); }} accessibilityRole="button">
              <AppText variant="small" color={COLORS.primary}>{label}</AppText>
            </Pressable>
          ))}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: COLORS.background },
  content: { flexGrow: 1, paddingHorizontal: SPACING.xl, paddingTop: SPACING.md, paddingBottom: SPACING.xl },
  topRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 36 },
  brandRow: { flexDirection: 'row', alignItems: 'center' },
  brandIcon: { width: 30, height: 30, backgroundColor: COLORS.primary, borderRadius: RADIUS.sm, alignItems: 'center', justifyContent: 'center', marginRight: SPACING.sm },
  brandText: { fontWeight: '700' },
  headingContainer: { marginBottom: SPACING.xl },
  subtitle: { marginTop: SPACING.sm, lineHeight: 22 },
  form: { width: '100%' },
  showPasswordButton: { alignSelf: 'flex-end', marginBottom: SPACING.md },
  passwordHint: { marginBottom: SPACING.lg },
  registerButton: { minHeight: 55, borderRadius: RADIUS.md },
  footer: { marginTop: 'auto', paddingTop: SPACING.xxl, flexDirection: 'row', justifyContent: 'center', alignItems: 'center' },
  footerLink: { fontWeight: '700' },
  switchRole: { alignItems: 'center', paddingTop: SPACING.md },
});
