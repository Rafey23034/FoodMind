import React, { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import PartnerLayout from '../../components/partner/PartnerLayout';
import usePartner from '../../components/partner/usePartner';
import usePartnerReviews from '../../components/partner/usePartnerReviews';
import AppText from '../../components/AppText';
import { Chip, EmptyState, Notice, Stars, ui } from '../../components/customer/ui';
import { ratingSummary, samplePartnerReviews } from '../../data/partnerReviews';
import { COLORS } from '../../theme/colors';

export default function PartnerReviewsScreen({ navigation, hasPartnerTabs }) {
  const { profile } = usePartner();
  const actual = usePartnerReviews();
  const reviews = actual.length ? actual : samplePartnerReviews;
  const summary = ratingSummary(reviews);
  const [filter, setFilter] = useState('All');
  const visible = reviews.filter(review => filter === 'All' || (filter === 'Low ratings' ? review.rating <= 3 : review.rating === Number(filter[0])));
  return <PartnerLayout navigation={navigation} title="Reviews & Ratings" onBack={hasPartnerTabs ? false : undefined} subtitle={profile.name || 'Your restaurant'} hasTabs={hasPartnerTabs}>
    {!actual.length ? <Notice icon="info" title="Example reviews">These sample reviews preview the design. Reviews from delivered customer orders replace them when available.</Notice> : null}
    <View style={[ui.card, ui.row]}>
      <View style={styles.score}><AppText style={styles.average}>{summary.average.toFixed(1)}</AppText><Stars compact value={summary.average} label="Average rating" /><AppText variant="caption" color={COLORS.textSecondary}>{summary.count} {actual.length ? 'reviews' : 'sample reviews'}</AppText></View>
      <View style={ui.flex}>{summary.distribution.map(item => <View key={item.rating} style={styles.barRow}>
        <AppText variant="caption" color={COLORS.textSecondary}>{item.rating}</AppText><View style={styles.bar}><View style={[styles.fill, { width: `${summary.count ? item.count / summary.count * 100 : 0}%` }]} /></View><AppText variant="caption" color={COLORS.textSecondary} style={styles.count}>{item.count}</AppText>
      </View>)}</View>
    </View>
    <View style={ui.wrap}>{['All', '5 ★', '4 ★', 'Low ratings'].map(value => <Chip key={value} label={value} selected={filter === value} onPress={() => setFilter(value)} />)}</View>
    {visible.length ? visible.map(review => <View key={review.id} style={ui.card}>
      <View style={ui.between}><View style={ui.flex}><AppText style={ui.bold}>{review.author}</AppText><AppText variant="caption" color={COLORS.textSecondary}>{review.verified ? 'Delivered order · ' : ''}{review.dateLabel}</AppText></View><Stars small value={review.rating} /></View>
      <AppText variant="small" color={COLORS.primary}>{review.dishName}{review.tags?.length ? ` · ${review.tags.join(' · ')}` : ''}</AppText>
      <AppText variant="small">{review.text || 'The customer left a star rating.'}</AppText>
    </View>) : <EmptyState title="No reviews for this filter">Choose another rating to see more feedback.</EmptyState>}
  </PartnerLayout>;
}
const styles = StyleSheet.create({
  score: { width: 94, gap: 5 }, average: { fontSize: 46, lineHeight: 55, fontWeight: '700', color: COLORS.text },
  barRow: { flexDirection: 'row', alignItems: 'center', gap: 7, marginVertical: 3 }, bar: { flex: 1, height: 6, borderRadius: 4, backgroundColor: COLORS.border, overflow: 'hidden' },
  fill: { height: 6, borderRadius: 4, backgroundColor: COLORS.primary }, count: { width: 22, textAlign: 'right' },
});
