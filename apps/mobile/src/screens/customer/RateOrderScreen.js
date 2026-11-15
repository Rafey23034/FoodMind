import React, { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { useDispatch, useSelector } from 'react-redux';
import ScreenLayout from '../../components/customer/ScreenLayout';
import AppText from '../../components/AppText';
import AppButton from '../../components/AppButton';
import AppInput from '../../components/AppInput';
import FoodThumbnail from '../../components/FoodThumbnail';
import { Chip, EmptyState, Notice, Stars, ui } from '../../components/customer/ui';
import { customerKey, saveReview, selectCustomer } from '../../redux/customerSlice';
import { COLORS } from '../../theme/colors';
import { routes } from '../../navigation/routes';
import { selectMyOrder } from '../../redux/ordersSlice';
import { saveApiReview } from '../../redux/apiThunks';

export default function RateOrderScreen({ navigation, route }) {
  const dispatch = useDispatch();
  const user = useSelector(state => state.auth.user);
  const account = useSelector(selectCustomer);
  const order = useSelector(state => selectMyOrder(state, route.params?.orderId));
  const existing = account.reviews.find(item => item.orderId === route.params?.orderId);
  const [rating, setRating] = useState(existing?.rating || 0);
  const [restaurantRating, setRestaurantRating] = useState(existing?.restaurantRating || 0);
  const [riderRating, setRiderRating] = useState(existing?.riderRating || 0);
  const [tags, setTags] = useState(existing?.tags || []);
  const [text, setText] = useState(existing?.text || '');
  const [error, setError] = useState('');
  const eligible = order?.status === 'Delivered';
  // A multi-item order lets the customer choose which dish the review is about.
  const items = order?.items || [];
  const [dishId, setDishId] = useState(existing?.dishId || items[0]?.dishId || items[0]?.id);
  const item = items.find(value => (value.dishId || value.id) === dishId) || items[0];
  function submit() {
    if (!eligible) return;
    if (!rating) { setError('Choose a dish rating before submitting.'); return; }
    dispatch(saveReview({ userKey: customerKey(user), review: {
      id: existing?.id || `review-${order.id}`, orderId: order.id,
      dishId: item.dishId || item.id, dishName: item.name, symbol: item.symbol,
      restaurant: order.restaurant, rating, restaurantRating, riderRating, tags,
      text: text.trim(), createdAt: existing?.createdAt || new Date().toISOString(),
    } }));
    if (order.source === 'api' && !existing) {
      dispatch(saveApiReview(order.id, {
        restaurantRating: restaurantRating || rating,
        riderRating,
        comment: text.trim(),
      }));
    }
    navigation.replace(routes.MY_REVIEWS);
  }
  return <ScreenLayout navigation={navigation} title="Rate Your Order" subtitle={order ? `${order.restaurant} · Order #${order.id.slice(-6)}` : ''}
    error={error} footer={<AppButton disabled={!eligible} title={existing ? 'Save Review Changes' : 'Submit Review · +20 Points'} onPress={submit} />}>
    {!eligible ? <EmptyState title="Rate a delivered order">Reviews become available once your delivery is complete.</EmptyState> : <>
      <Notice title={existing ? 'Update your food story' : 'Enjoyed your meal? Share your experience'}>
        {existing ? 'Your original reward stays the same when you edit.' : 'Earn +20 reward points for your first review of this order.'}
      </Notice>
      <View style={ui.card}>
        {items.length > 1 ? <View style={ui.wrap}>{items.map(value => <Chip key={value.id} label={value.name}
          selected={(value.dishId || value.id) === (item.dishId || item.id)} onPress={() => setDishId(value.dishId || value.id)} />)}</View> : null}
        <View style={ui.row}><FoodThumbnail dishId={item.dishId || item.id} symbol={item.symbol} size={70} />
          <View style={ui.flex}><AppText style={ui.bold}>{item.name}</AppText><AppText variant="small" color={COLORS.textSecondary}>{order.restaurant}</AppText></View>
        </View>
        <AppText style={[ui.bold, ui.center]}>How was your dish?</AppText>
        <View style={styles.center}><Stars value={rating} onChange={setRating} label="Dish rating" /></View>
        <AppText variant="small" color={COLORS.primary} style={ui.center}>{['Tap a star to rate', 'Could be better', 'It was okay', 'Good meal', 'Really enjoyed it', 'Excellent! Loved it'][rating]}</AppText>
      </View>
      <AppText variant="subheading">What stood out?</AppText>
      <View style={ui.wrap}>{['Great taste', 'Generous portion', 'Fresh ingredients', 'Good value'].map(tag => <Chip key={tag} label={tag} selected={tags.includes(tag)}
        onPress={() => setTags(previous => previous.includes(tag) ? previous.filter(item => item !== tag) : [...previous, tag])} />)}</View>
      <AppInput label="WRITE YOUR REVIEW" value={text} onValueChange={setText} placeholder="Tell others about your meal..." multiline maxLength={1000} />
      <AppText variant="subheading">Rate the restaurant & rider</AppText>
      <View style={ui.between}><AppText variant="small">Restaurant</AppText><Stars small value={restaurantRating} onChange={setRestaurantRating} label="Restaurant rating" /></View>
      <View style={ui.between}><AppText variant="small">Rider</AppText><Stars small value={riderRating} onChange={setRiderRating} label="Rider rating" /></View>
    </>}
  </ScreenLayout>;
}
const styles = StyleSheet.create({ center: { alignItems: 'center' } });
