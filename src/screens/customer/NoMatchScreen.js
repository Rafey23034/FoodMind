import React from 'react';
import { StyleSheet, View } from 'react-native';
import { resetSearch } from '../../navigation/customerNavigation';
import AppText from '../../components/AppText';
import AppButton from '../../components/AppButton';
import Icon from '../../components/Icon';
import ScreenLayout from '../../components/customer/ScreenLayout';
import { ui } from '../../components/customer/ui';
import { routes } from '../../navigation/routes';
import { COLORS } from '../../theme/colors';

export function NoMatchContent({ query, onReset, onAskAI }) {
  return <View style={styles.content}>
    <View style={styles.halo}><View style={styles.face}><Icon name="search" size={44} /></View></View>
    <AppText variant="subheading" style={ui.center}>No matching dishes found</AppText>
    <AppText variant="small" color={COLORS.textSecondary} style={ui.center}>
      We couldn't find a match for those filters. Try a bigger budget or fewer restrictions.
    </AppText>
    <View style={[ui.card, styles.filters]}>
      <AppText variant="caption" color={COLORS.textSecondary}>ACTIVE FILTERS</AppText>
      <AppText variant="small" style={ui.bold}>{query || 'Your search and preferences'}</AppText>
    </View>
    <AppButton title="Reset Filters" onPress={onReset} />
    <AppButton title="Ask FoodMind AI instead" variant="outline" onPress={onAskAI} />
  </View>;
}
export default function NoMatchScreen({ navigation, route }) {
  return <ScreenLayout navigation={navigation} title="Search">
    <NoMatchContent query={route.params?.prompt}
      onReset={() => resetSearch(navigation)}
      onAskAI={() => navigation.navigate(routes.AI, { prompt: route.params?.prompt || '' })} />
  </ScreenLayout>;
}
const styles = StyleSheet.create({
  content: { gap: 14, paddingVertical: 24 },
  halo: { width: 150, height: 150, borderRadius: 75, backgroundColor: COLORS.primaryLight, alignSelf: 'center', justifyContent: 'center', alignItems: 'center', marginBottom: 12 },
  face: { width: 108, height: 108, borderRadius: 54, borderColor: COLORS.border, borderWidth: 2, backgroundColor: COLORS.surface, justifyContent: 'center', alignItems: 'center' },
  filters: { gap: 5, marginVertical: 8 },
});
