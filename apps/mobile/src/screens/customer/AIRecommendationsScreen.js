import { openCart, resetSearch } from '../../navigation/customerNavigation';
import React, { useEffect, useState } from 'react';
import { Image, Pressable, StyleSheet, View } from 'react-native';
import { useDispatch, useSelector } from 'react-redux';
import AppText from '../../components/AppText';
import AppButton from '../../components/AppButton';
import DishCard from '../../components/DishCard';
import ScreenLayout from '../../components/customer/ScreenLayout';
import { Notice, ui } from '../../components/customer/ui';
import { NoMatchContent } from './NoMatchScreen';
import { selectAvailableItems } from '../../redux/menuSlice';
import { addItem } from '../../redux/cartSlice';
import { restaurant, makeCartItem, formatPrice, ratingLabel } from '../../data/catalog';
import { matchDishes } from '../../data/discovery';
import { getFoodPhoto } from '../../data/foodPhotos';
import { COLORS } from '../../theme/colors';
import { routes } from '../../navigation/routes';
import { requestAIRecommendations } from '../../services/aiRecommendations';

const EMPTY_PREFERENCES = [];

export default function AIRecommendationsScreen({ navigation, route }) {
  const dispatch = useDispatch();
  const menuItems = useSelector(selectAvailableItems);
  const prompt = route.params?.prompt || 'Creamy chicken pasta under Rs. 1,200';
  const preferences = route.params?.preferences || EMPTY_PREFERENCES;
  const [matches, setMatches] = useState(() => matchDishes(menuItems, prompt, preferences));
  const [loading, setLoading] = useState(true);
  const [aiNotice, setAiNotice] = useState('');

  useEffect(() => {
    let active = true;
    setLoading(true);
    setAiNotice('');
    setMatches(matchDishes(menuItems, prompt, preferences));
    // The server returns IDs only; mapping them back to this menu prevents AI-created dishes.
    requestAIRecommendations({ prompt, preferences, menu: menuItems })
      .then(recommendations => {
        if (!active) return;
        const byId = new Map(menuItems.map(item => [item.id, item]));
        const aiMatches = recommendations.map(item => {
          const dish = byId.get(item.dishId);
          return dish ? { ...dish, aiReason: item.reason } : null;
        }).filter(Boolean);
        if (aiMatches.length) setMatches(aiMatches);
        else setAiNotice('No AI matches were returned. Showing menu matches instead.');
      })
      .catch(() => {
        if (active) setAiNotice('FoodMind AI is unavailable. Showing menu matches instead.');
      })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [prompt, preferences, menuItems]);

  const top = matches[0];
  const photo = getFoodPhoto(top);
  function add(dish) {
    dispatch(addItem(makeCartItem(dish)));
    openCart(navigation);
  }
  return <ScreenLayout navigation={navigation} title="AI Recommendations" subtitle={loading ? 'Finding your best matches...' : 'AI-powered menu recommendations'}>
    {loading ? <Notice icon="ai" title="FoodMind AI is thinking">Checking your request against the current menu.</Notice> : null}
    {aiNotice ? <Notice icon="info" title="Using local matching">{aiNotice}</Notice> : null}
    {!top ? <NoMatchContent query={prompt} onReset={() => resetSearch(navigation)}
      onAskAI={() => navigation.navigate(routes.AI, { prompt })} /> : <>
      <Notice icon="ai" title="Best matches for">“{prompt}”</Notice>
      <View style={ui.between}><AppText variant="subheading">Top Match</AppText><AppText color={COLORS.primary} variant="small" style={ui.bold}>FoodMind Pick</AppText></View>
      <View style={styles.heroCard}>
        <Pressable onPress={() => navigation.navigate(routes.DISH_DETAIL, { dishId: top.id })}>
          {photo ? <Image source={photo} style={styles.photo} /> : <View style={styles.photo}><AppText style={styles.emoji}>{top.symbol}</AppText></View>}
          <View style={styles.photoBadge}><AppText variant="small" style={ui.bold}>{top.category} · {restaurant.time}</AppText></View>
        </Pressable>
        <View style={styles.heroBody}>
          <View style={ui.between}><AppText variant="subheading" style={ui.flex}>{top.name}</AppText><AppText color={COLORS.warning} style={ui.bold}>★ {ratingLabel(top)}</AppText></View>
          <AppText variant="small" color={COLORS.textSecondary}>{restaurant.name}</AppText>
          <AppText variant="heading" color={COLORS.primary}>{formatPrice(top.price)}</AppText>
          <Notice icon="check" title="Why this matches">{top.aiReason || `${top.tags.join(' · ')}. Price and rating come from the current menu.`}</Notice>
          <AppButton title="+  Add to Cart" onPress={() => add(top)} />
          {matches.length > 1 ? <AppButton title="Compare Dishes" icon="swap" variant="outline"
            onPress={() => navigation.navigate(routes.COMPARE_DISHES, { dishIds: [top.id, matches[1].id] })} /> : null}
        </View>
      </View>
      {matches.length > 1 ? <AppText variant="subheading">Other good matches</AppText> : null}
      {matches.slice(1).map(dish => <View key={dish.id}>
        <DishCard dish={dish} restaurant={restaurant} showRestaurant={false} onPress={() => navigation.navigate(routes.DISH_DETAIL, { dishId: dish.id })} />
      </View>)}
      <AppButton title="Refine Search & Preferences" variant="outline" onPress={() => navigation.navigate(routes.AI, { prompt })} />
    </>}
  </ScreenLayout>;
}
const styles = StyleSheet.create({
  heroCard: { backgroundColor: COLORS.surface, borderRadius: 16, borderWidth: 1, borderColor: COLORS.border, overflow: 'hidden' },
  heroBody: { padding: 16, gap: 12 },
  photo: { width: '100%', height: 215, backgroundColor: COLORS.primaryLight, justifyContent: 'center', alignItems: 'center' },
  photoBadge: { position: 'absolute', top: 14, left: 14, backgroundColor: COLORS.white, padding: 8, borderRadius: 20 },
  emoji: { fontSize: 80, lineHeight: 96 },
});
