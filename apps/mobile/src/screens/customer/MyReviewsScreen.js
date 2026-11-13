import { openOrderHistory } from '../../navigation/customerNavigation';
import React from 'react';
import { Pressable, View } from 'react-native';
import { useSelector } from 'react-redux';
import ScreenLayout from '../../components/customer/ScreenLayout';
import AppText from '../../components/AppText';
import AppButton from '../../components/AppButton';
import FoodThumbnail from '../../components/FoodThumbnail';
import { EmptyState, Notice, Stars, ui } from '../../components/customer/ui';
import { selectCustomer } from '../../redux/customerSlice';
import { plural } from '../../utils/format';
import { COLORS } from '../../theme/colors';
import { routes } from '../../navigation/routes';

export default function MyReviewsScreen({ navigation }) {
  const { reviews } = useSelector(selectCustomer);
  return <ScreenLayout navigation={navigation} title="My Reviews" subtitle="Your food stories & ratings">
    <Notice icon="star" title={`${plural(reviews.length, 'review')} written`}>Thanks for helping the food community!</Notice>
    <View style={ui.between}><AppText variant="subheading">Recent reviews</AppText><AppText variant="small" color={COLORS.textSecondary}>Newest first</AppText></View>
    {!reviews.length ? <><EmptyState title="Your first food story awaits">Complete an order, then share what you loved about your meal.</EmptyState><AppButton title="View My Orders" onPress={() => openOrderHistory(navigation)} /></> : reviews.map(review => <View key={review.id} style={ui.card}>
      <View style={ui.row}>
        <FoodThumbnail dishId={review.dishId} symbol={review.symbol} size={62} />
        <View style={ui.flex}><AppText style={ui.bold}>{review.dishName}</AppText><AppText variant="caption" color={COLORS.textSecondary}>{review.restaurant} · {new Date(review.createdAt).toLocaleDateString()}</AppText></View>
        <Pressable accessibilityRole="button" accessibilityLabel={`Edit review of ${review.dishName}`} hitSlop={10} onPress={() => navigation.navigate(routes.RATE_ORDER, { orderId: review.orderId })}><AppText variant="small" color={COLORS.primary} style={ui.bold}>Edit</AppText></Pressable>
      </View>
      <Stars small value={review.rating} />
      {review.text ? <AppText variant="small">“{review.text}”</AppText> : null}
      {review.tags?.length ? <AppText variant="caption" color={COLORS.primary}>{review.tags.join(' · ')}</AppText> : null}
    </View>)}
    <AppText variant="caption" color={COLORS.textSecondary} style={ui.center}>Your reviews help people find great food</AppText>
  </ScreenLayout>;
}
