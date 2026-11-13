import React, { useEffect, useState } from 'react';
import { Pressable, StyleSheet, TextInput, View } from 'react-native';
import Animated, { FadeIn } from 'react-native-reanimated';
import ScreenFrame from '../../components/ScreenFrame';
import AppText from '../../components/AppText';
import AppButton from '../../components/AppButton';
import Icon from '../../components/Icon';
import { Chip, ui } from '../../components/customer/ui';
import { restaurant } from '../../data/catalog';
import { restaurantMeetsTime } from '../../data/discovery';
import { routes } from '../../navigation/routes';
import { COLORS } from '../../theme/colors';
import { RADIUS, SPACING } from '../../theme/spacing';
import { TYPOGRAPHY } from '../../theme/typography';

// Every suggestion here returns real matches from the current menu.
const CRAVINGS = [
  { emoji: '🍝', text: 'Creamy chicken pasta under Rs. 1,200' },
  { emoji: '🔥', text: 'Spicy midnight comfort food' },
  { emoji: '🌶️', text: 'Spicy chicken under Rs. 900' },
  { emoji: '🥘', text: 'Authentic biryani nearby' },
];

export default function AIScreen({ navigation, route }) {
  const [request, setRequest] = useState(route?.params?.prompt || '');
  const [selected, setSelected] = useState([]);
  const [hint, setHint] = useState('');
  useEffect(() => {
    if (route?.params?.prompt !== undefined) setRequest(route.params.prompt);
  }, [route?.params?.prompt]);
  // A 30-minute filter is only offered when the restaurant can actually deliver that fast.
  const fastAvailable = restaurantMeetsTime(restaurant.time, 30);
  const preferences = [
    { key: 'budget', icon: 'wallet', label: 'Under Rs. 1,000' },
    { key: 'rating', icon: 'star', label: 'Rating 4.5+' },
    { key: 'fast', icon: 'bolt', label: 'Under 30 mins', disabled: !fastAvailable },
  ];
  const toggle = key => setSelected(previous => previous.includes(key) ? previous.filter(value => value !== key) : [...previous, key]);
  return (
    <ScreenFrame navigation={navigation} title="FoodMind AI"
      right={<Pressable accessibilityRole="button" accessibilityLabel="Clear request" hitSlop={10} onPress={() => { setRequest(''); setSelected([]); setHint(''); }}>
        <AppText variant="small" color={COLORS.primary} style={ui.bold}>Clear</AppText></Pressable>}
      footer={<AppButton title="Find My Food  →" disabled={!request.trim()}
        onPress={() => navigation.navigate(routes.AI_RECOMMENDATIONS, { prompt: request.trim(), preferences: selected })} />}>
      <Animated.View entering={FadeIn.duration(300)} style={styles.banner}>
        <View style={styles.aiSquare}><Icon name="ai" size={22} color={COLORS.white} /></View>
        <View style={ui.flex}>
          <AppText variant="subheading">Tell me what you're craving</AppText>
          <AppText variant="small" color={COLORS.textSecondary}>Use natural language. Mention food type, budget, dietary needs, or even your mood.</AppText>
        </View>
      </Animated.View>

      <View style={ui.between}>
        <AppText variant="caption" color={COLORS.textSecondary} style={styles.section}>POPULAR CRAVINGS</AppText>
        <AppText variant="caption" color={COLORS.textSecondary}>Tap to insert</AppText>
      </View>
      <View style={ui.wrap}>
        {CRAVINGS.map(item => <Chip key={item.text} label={`${item.emoji}  ${item.text}`} selected={request === item.text} onPress={() => setRequest(item.text)} />)}
      </View>

      <AppText variant="caption" color={COLORS.textSecondary} style={styles.section}>YOUR REQUEST</AppText>
      <View style={styles.requestBox}>
        <TextInput accessibilityLabel="Your food request" value={request} onChangeText={setRequest}
          maxLength={200} multiline placeholder="E.g., Find me a rich chicken pasta under Rs. 1,200, highly rated..."
          placeholderTextColor={COLORS.textSecondary} style={styles.input} />
        <View style={ui.between}>
          <AppText variant="caption" color={COLORS.textSecondary}>{request.length} / 200 characters</AppText>
          <Pressable accessibilityRole="button" accessibilityLabel="Voice input information" hitSlop={8}
            onPress={() => setHint('Voice input will be connected with the AI service. You can type your request above.')} style={styles.microphone}>
            <Icon name="microphone" size={16} />
          </Pressable>
        </View>
      </View>
      {hint ? <AppText variant="caption" color={COLORS.textSecondary}>{hint}</AppText> : null}

      <AppText variant="caption" color={COLORS.textSecondary} style={styles.section}>QUICK PREFERENCES</AppText>
      <View style={ui.wrap}>
        {preferences.map(item => <Pressable key={item.key} disabled={item.disabled} onPress={() => toggle(item.key)}
          accessibilityRole="button" accessibilityState={{ selected: selected.includes(item.key), disabled: item.disabled }}
          style={[styles.preference, selected.includes(item.key) && styles.preferenceSelected, item.disabled && styles.preferenceDisabled]}>
          <Icon name={item.icon} size={13} color={item.disabled ? COLORS.textSecondary : COLORS.primary} />
          <AppText variant="small" color={item.disabled ? COLORS.textSecondary : COLORS.text}>{item.label}</AppText>
        </Pressable>)}
      </View>
      {!fastAvailable ? <AppText variant="caption" color={COLORS.textSecondary}>{restaurant.name} currently delivers in {restaurant.time}, so the 30-minute filter is unavailable.</AppText> : null}
    </ScreenFrame>
  );
}

const styles = StyleSheet.create({
  banner: { backgroundColor: COLORS.primaryLight, padding: SPACING.lg, borderRadius: RADIUS.lg, borderColor: COLORS.primaryBorder, borderWidth: 1, flexDirection: 'row', alignItems: 'flex-start', gap: SPACING.md },
  aiSquare: { width: 52, height: 52, backgroundColor: COLORS.primary, borderRadius: RADIUS.md, justifyContent: 'center', alignItems: 'center' },
  section: { fontWeight: '700', letterSpacing: 1 },
  requestBox: { backgroundColor: COLORS.surface, borderColor: COLORS.border, borderWidth: 1, borderRadius: RADIUS.lg, padding: SPACING.lg, gap: SPACING.sm },
  input: { ...TYPOGRAPHY.body, color: COLORS.text, minHeight: 110, textAlignVertical: 'top', padding: 0 },
  microphone: { width: 36, height: 36, borderRadius: 18, backgroundColor: COLORS.primaryLight, alignItems: 'center', justifyContent: 'center' },
  preference: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 14, paddingVertical: 10, borderRadius: RADIUS.pill, borderWidth: 1, borderColor: COLORS.border, backgroundColor: COLORS.surface },
  preferenceSelected: { borderColor: COLORS.primary, backgroundColor: COLORS.primaryLight },
  preferenceDisabled: { backgroundColor: COLORS.inputBackground, opacity: 0.7 },
});
