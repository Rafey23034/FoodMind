import React from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { FontAwesomeIcon } from '@fortawesome/react-native-fontawesome';
import { faMotorcycle, faLocationDot, faWallet } from '@fortawesome/free-solid-svg-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import AppButton from '../../components/AppButton';
import AppText from '../../components/AppText';
import { COLORS } from '../../theme/colors';
import { SPACING } from '../../theme/spacing';

export default function RiderWelcomeScreen({ onRegister, onSignIn }) {
  return <SafeAreaView style={styles.screen}>
    <View style={styles.content}>
      <View style={styles.hero}>
        <View style={styles.badge}><AppText variant="caption" color={COLORS.primary}>FOODMIND RIDER</AppText></View>
        <View style={styles.illustration}><FontAwesomeIcon icon={faMotorcycle} size={62} color={COLORS.primary} /></View>
        <AppText variant="title" style={styles.title}>Ride. Deliver. Earn.</AppText>
        <AppText variant="small" color={COLORS.textSecondary} style={styles.copy}>Flexible deliveries, fair bids and reliable earnings on your track.</AppText>
        <View style={styles.benefits}>
          <View style={styles.benefit}><FontAwesomeIcon icon={faWallet} size={17} color={COLORS.primary} /><AppText variant="small" style={styles.benefitText}>Set your price</AppText><AppText variant="caption" color={COLORS.textSecondary}>Bid on nearby deliveries</AppText></View>
          <View style={styles.benefit}><FontAwesomeIcon icon={faLocationDot} size={17} color={COLORS.primary} /><AppText variant="small" style={styles.benefitText}>Stay in control</AppText><AppText variant="caption" color={COLORS.textSecondary}>Accept the jobs you want</AppText></View>
        </View>
      </View>
      <View style={styles.actions}>
        <AppButton title="Become a Rider" onPress={onRegister} />
        <Pressable accessibilityRole="button" onPress={onSignIn} style={styles.signIn}>
          <AppText variant="small" color={COLORS.primary}>I already have an account · Sign in</AppText>
        </Pressable>
      </View>
    </View>
  </SafeAreaView>;
}
const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: COLORS.background }, content: { flex: 1, padding: 24 },
  hero: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 15 },
  badge: { paddingHorizontal: 13, paddingVertical: 6, borderRadius: 16, backgroundColor: COLORS.white },
  illustration: { width: 126, height: 126, borderRadius: 64, backgroundColor: COLORS.white, borderWidth: 5, borderColor: COLORS.primaryBorder, alignItems: 'center', justifyContent: 'center' },
  title: { textAlign: 'center' }, copy: { textAlign: 'center', maxWidth: 290 },
  benefits: { alignSelf: 'stretch', gap: 10, marginTop: 14 },
  benefit: { backgroundColor: COLORS.white, borderRadius: 16, padding: 13, gap: 4, borderWidth: 1, borderColor: COLORS.border },
  benefitText: { fontWeight: '700' }, actions: { gap: 10, paddingBottom: SPACING.md },
  signIn: { minHeight: 48, alignItems: 'center', justifyContent: 'center', borderRadius: 14, backgroundColor: COLORS.white, borderWidth: 1, borderColor: COLORS.border },
});
