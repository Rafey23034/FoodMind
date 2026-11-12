import React, { useEffect, useState } from 'react';
import { View, Pressable, StyleSheet, ScrollView, FlatList } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useSelector } from 'react-redux';
import Header from '../../components/Header';
import SearchBar from '../../components/SearchBar';
import AppText from '../../components/AppText';
import AppButton from '../../components/AppButton';
import Icon from '../../components/Icon';
import StarIcon from '../../components/icons/StarIcon';
import FoodThumbnail from '../../components/FoodThumbnail';
import { restaurant, formatPrice, ratingLabel } from '../../data/catalog';
import { searchDishes } from '../../data/discovery';
import { selectAvailableItems } from '../../redux/menuSlice';
import { routes } from '../../navigation/routes';
import { plural } from '../../utils/format';
import { NoMatchContent } from './NoMatchScreen';
import { COLORS } from '../../theme/colors';
import { RADIUS } from '../../theme/spacing';

const TABS = ['All', 'Dishes', 'Restaurants', '4.5+'];

export default function SearchScreen({ navigation, route }) {
  const [activeTab, setActiveTab] = useState('All');
  const [query, setQuery] = useState('');
  useEffect(() => {
    if (route?.params?.reset) { setQuery(''); setActiveTab('All'); }
  }, [route?.params?.reset]);

  const menuItems = useSelector(selectAvailableItems);
  const term = query.trim().toLowerCase();
  const filteredData = [];
  if (activeTab === 'All' || activeTab === 'Restaurants') {
    const description = `${restaurant.name} ${restaurant.cuisine}`.toLowerCase();
    if (!term || description.includes(term)) filteredData.push({ ...restaurant, type: 'Restaurants' });
  }
  if (activeTab !== 'Restaurants') {
    for (const dish of searchDishes(menuItems, term)) {
      if (activeTab === '4.5+' && dish.rating < 4.5) continue;
      filteredData.push({ ...dish, type: 'Dishes' });
    }
  }

  const renderItem = ({ item }) => {
    const isRestaurant = item.type === 'Restaurants';
    return <Pressable style={styles.card} accessibilityRole="button" accessibilityLabel={`Open ${item.name}`}
      onPress={() => navigation.navigate(isRestaurant ? routes.RESTAURANT_DETAIL : routes.DISH_DETAIL, isRestaurant ? { restaurantId: item.id } : { dishId: item.id })}>
      <FoodThumbnail dishId={isRestaurant ? undefined : item.id} restaurantId={isRestaurant ? item.id : undefined} symbol={item.symbol} size={80} />
      <View style={styles.cardContent}>
        <AppText style={styles.bold}>{item.name}</AppText>
        <AppText variant="small" color={COLORS.textSecondary}>{isRestaurant ? item.cuisine : `${restaurant.name} • ${item.category}`}</AppText>
        <View style={styles.metaRow}>
          <View style={styles.ratingRow}><StarIcon /><AppText variant="small" style={styles.bold}>{isRestaurant ? item.rating : ratingLabel(item)}</AppText></View>
          <AppText color={COLORS.primary} style={styles.bold}>{isRestaurant ? item.time : formatPrice(item.price)}</AppText>
        </View>
      </View>
    </Pressable>;
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <Header title="Search" centerTitle />
      <SearchBar placeholder="Search dishes, restaurants or cravings" value={query} onChangeText={setQuery} />
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.tabsContainer} contentContainerStyle={styles.tabs}>
        {TABS.map(tab => (
          <Pressable key={tab} accessibilityRole="button" accessibilityState={{ selected: activeTab === tab }}
            style={[styles.tab, activeTab === tab && styles.activeTab]} onPress={() => setActiveTab(tab)}>
            <AppText variant="small" color={activeTab === tab ? COLORS.white : COLORS.text} style={styles.medium}>{tab}</AppText>
          </Pressable>
        ))}
      </ScrollView>
      <AppText variant="caption" color={COLORS.textSecondary} style={styles.count}>{plural(filteredData.length, 'result').toUpperCase()}</AppText>
      <FlatList
        data={filteredData}
        keyExtractor={item => `${item.type}-${item.id}`}
        renderItem={renderItem}
        contentContainerStyle={styles.listContent}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={<NoMatchContent query={query || activeTab} onReset={() => { setQuery(''); setActiveTab('All'); }}
          onAskAI={() => navigation.navigate(routes.AI, { prompt: query })} />}
        ListFooterComponent={filteredData.length ? <View style={styles.aiCard}>
          <View style={styles.aiHeader}><Icon name="ai" size={18} /><AppText variant="subheading">Try FoodMind AI</AppText></View>
          <AppText variant="small" color={COLORS.textSecondary}>Looking for something specific? Describe it in your own words.</AppText>
          <AppButton title="Ask AI  →" onPress={() => navigation.navigate(routes.AI, { prompt: query })} style={styles.aiButton} />
        </View> : null}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  bold: { fontWeight: '700' }, medium: { fontWeight: '600' },
  tabsContainer: { marginTop: 12, flexGrow: 0, flexShrink: 0 },
  tabs: { paddingHorizontal: 20, gap: 10 },
  tab: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: RADIUS.pill, backgroundColor: COLORS.surface, borderWidth: 1, borderColor: COLORS.border },
  activeTab: { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
  count: { paddingHorizontal: 20, marginTop: 15, marginBottom: 10, fontWeight: '700' },
  listContent: { paddingHorizontal: 20, paddingBottom: 20 },
  card: { flexDirection: 'row', backgroundColor: COLORS.surface, padding: 12, borderRadius: RADIUS.lg, marginBottom: 12, borderWidth: 1, borderColor: COLORS.border },
  cardContent: { flex: 1, marginLeft: 12, justifyContent: 'center', gap: 4 },
  metaRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  ratingRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  aiCard: { backgroundColor: COLORS.primaryLight, borderRadius: RADIUS.lg, padding: 20, marginTop: 10, borderWidth: 1, borderColor: COLORS.primaryBorder, gap: 10 },
  aiHeader: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  aiButton: { alignSelf: 'flex-start', borderRadius: RADIUS.pill, minHeight: 44 },
});
