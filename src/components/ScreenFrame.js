import React from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Header from './Header';
import AppText from './AppText';
import { COLORS } from '../theme/colors';

// The one page frame for customer, partner and rider screens: header, scrolling body,
// and a fixed footer. Form errors render right above the footer button the user just pressed.
// Inside a tab navigator only the top edge is padded; the tab bar already handles the bottom.
export default function ScreenFrame({ navigation, title, subtitle, children, footer, error, right, onBack, backLabel, hasTabs = true }) {
  const back = onBack === false ? null : onBack || (() => navigation.goBack());
  return (
    <SafeAreaView style={styles.screen} edges={hasTabs ? ['top'] : ['top', 'bottom']}>
      <KeyboardAvoidingView style={styles.screen} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <Header title={title} onBack={back} backLabel={backLabel} centerTitle right={right} />
        {subtitle ? <AppText variant="small" color={COLORS.textSecondary} style={styles.subtitle}>{subtitle}</AppText> : null}
        <ScrollView style={styles.scroll} contentContainerStyle={styles.content}
          keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
          {children}
        </ScrollView>
        {footer || error ? <View style={styles.footer}>
          {error ? <AppText variant="small" color={COLORS.danger} accessibilityLiveRegion="polite" style={styles.error}>{error}</AppText> : null}
          {footer}
        </View> : null}
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: COLORS.background },
  scroll: { flex: 1 },
  content: { paddingHorizontal: 20, paddingTop: 10, paddingBottom: 28, gap: 16 },
  subtitle: { textAlign: 'center', paddingHorizontal: 20, marginTop: -4, marginBottom: 8 },
  footer: { padding: 16, paddingTop: 12, gap: 10, backgroundColor: COLORS.background, borderTopWidth: 1, borderTopColor: COLORS.border },
  error: { textAlign: 'center' },
});
