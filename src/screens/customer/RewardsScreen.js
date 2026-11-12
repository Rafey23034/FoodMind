import { openOrderHistory } from '../../navigation/customerNavigation';
import React, { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { useDispatch, useSelector } from 'react-redux';
import ScreenLayout from '../../components/customer/ScreenLayout';
import AppText from '../../components/AppText';
import AppButton from '../../components/AppButton';
import { EmptyState, ui } from '../../components/customer/ui';
import Icon from '../../components/Icon';
import { customerKey, redeemReward, selectCustomer, selectPoints } from '../../redux/customerSlice';
import { COLORS } from '../../theme/colors';

export default function RewardsScreen({ navigation }) {
  const dispatch = useDispatch();
  const user = useSelector(state => state.auth.user);
  const account = useSelector(selectCustomer);
  const points = useSelector(selectPoints);
  const [redeeming, setRedeeming] = useState(false);
  const history = [...(account.pointsHistory || []), ...account.redemptions.map(item => ({ ...item, amount: -item.points }))]
    .sort((a, b) => String(b.createdAt || '').localeCompare(String(a.createdAt || '')));
  return <ScreenLayout navigation={navigation} title="Points & Rewards" footer={<AppButton title="Redeem Rewards" disabled={points < 100} onPress={() => setRedeeming(!redeeming)} />}>
    <View style={styles.balance}>
      <View style={ui.row}><Icon name="crown" size={14} color={COLORS.white} /><AppText variant="small" color={COLORS.white} style={ui.bold}>YOUR REWARDS BALANCE</AppText></View>
      <AppText style={styles.amount}>{points}<AppText color={COLORS.white}> points</AppText></AppText>
      <AppText variant="small" color={COLORS.white}>{points >= 100 ? 'Your next reward is ready!' : `${100 - points} points to your next reward`}</AppText>
      <View style={styles.track}><View style={[styles.fill, { width: `${Math.min(100, points)}%` }]} /></View>
    </View>
    {redeeming ? <View style={ui.card}>
      <AppText variant="subheading">Rs. 100 demo voucher</AppText><AppText variant="small" color={COLORS.textSecondary}>Redeem 100 points. Vouchers are saved for this prototype; checkout redemption will be connected later.</AppText>
      <AppButton title="Redeem 100 Points" disabled={points < 100} onPress={() => {
        dispatch(redeemReward({ userKey: customerKey(user), id: `reward-${Date.now()}`, createdAt: new Date().toISOString() })); setRedeeming(false);
      }} /><AppButton title="Maybe later" variant="text" onPress={() => setRedeeming(false)} />
    </View> : null}
    <AppText variant="subheading">How to earn more</AppText>
    {[['star', 'Write a food review', 'Share your experience after delivery.', '+20'], ['bag', 'Complete an order', 'Earn points when an order is delivered.', '+20']].map(([icon, title, text, value]) => <View key={title} style={[ui.card, ui.row]}>
      <View style={styles.earnIcon}><Icon name={icon} size={18} /></View><View style={ui.flex}><AppText style={ui.bold}>{title}</AppText><AppText variant="small" color={COLORS.textSecondary}>{text}</AppText></View><AppText color={COLORS.success} style={ui.bold}>{value}</AppText>
    </View>)}
    <AppButton title="View My Orders" variant="outline" onPress={() => openOrderHistory(navigation)} />
    <AppText variant="subheading">Points history</AppText>
    {!history.length ? <EmptyState title="Start earning points">Your completed orders and reviews will appear here.</EmptyState> : history.map(event => <View key={event.id} style={ui.between}>
      <View style={ui.flex}><AppText variant="small" style={ui.bold}>{event.label}</AppText><AppText variant="caption" color={COLORS.textSecondary}>{new Date(event.createdAt).toLocaleDateString()}</AppText></View>
      <AppText color={event.amount > 0 ? COLORS.success : COLORS.primary} style={ui.bold}>{event.amount > 0 ? '+' : ''}{event.amount}</AppText>
    </View>)}
    {account.redemptions.length ? <View style={ui.card}><AppText style={ui.bold}>Your saved demo vouchers</AppText>{account.redemptions.map(reward => <AppText key={reward.id} variant="small" color={COLORS.textSecondary}>{reward.label} · {reward.id}</AppText>)}</View> : null}
  </ScreenLayout>;
}
const styles = StyleSheet.create({
  balance: { borderRadius: 16, padding: 24, gap: 12, backgroundColor: COLORS.primary },
  earnIcon: { width: 40, height: 40, borderRadius: 12, backgroundColor: COLORS.primaryLight, alignItems: 'center', justifyContent: 'center' },
  amount: { fontSize: 60, lineHeight: 70, fontWeight: '700', color: COLORS.white },
  track: { height: 8, borderRadius: 4, backgroundColor: COLORS.primaryMuted, marginTop: 5, overflow: 'hidden' }, fill: { height: 8, borderRadius: 4, backgroundColor: COLORS.white },
});
