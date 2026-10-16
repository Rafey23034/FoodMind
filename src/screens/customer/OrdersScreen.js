
import React, { useState } from 'react';
import { Alert, Image, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import AppButton from '../../components/AppButton';
import AppCard from '../../components/AppCard';
import AppText from '../../components/AppText';
import { useShop } from '../../state/ShopContext';
import { COLORS } from '../../theme/colors';
import { routes } from '../../navigation/routes';

const money = value => `Rs. ${value.toLocaleString('en-PK')}`;
const stages = ['Confirmed', 'Preparing', 'On the way', 'Delivered'];

export default function OrdersScreen({ navigation }) {
  const { orders, cancelOrder, reorder } = useShop();
  const [selectedTab, setSelectedTab] = useState('active');

  const activeOrders = orders.filter(order => order.status !== 'Delivered' && order.status !== 'Cancelled');
  const pastOrders = orders.filter(order => order.status === 'Delivered' || order.status === 'Cancelled');

  function handleCancel(id) {
    Alert.alert('Cancel Order', 'Are you sure you want to cancel this order?', [
      { text: 'No' },
      { text: 'Yes, Cancel', onPress: () => cancelOrder(id) },
    ]);
  }

  function handleReorder(order) {
    reorder(order);
    navigation.navigate(routes.CART);
  }

  function renderPastOrder(order) {
    return (
      <AppCard key={order.id} style={styles.previousCard}>
        <Image source={{ uri: order.items[0]?.image }} style={styles.previousImage} />
        <View style={styles.flex}>
          <AppText style={styles.bold}>{order.restaurant}</AppText>
          <AppText variant="small" color={COLORS.textSecondary}>
            {order.description || order.items.map(item => item.name).join(', ')}
          </AppText>
          <View style={styles.row}>
            <AppText style={styles.bold}>{money(order.total)}</AppText>
            <AppText variant="caption" color={order.status === 'Delivered' ? COLORS.success : COLORS.danger}>
              · {order.status}
            </AppText>
          </View>
        </View>
        <Pressable style={styles.reorderButton} onPress={() => handleReorder(order)}>
          <AppText variant="small" color={COLORS.primary}>Reorder</AppText>
        </Pressable>
      </AppCard>
    );
  }

  return (
    <SafeAreaView style={styles.screen}>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.header}>
          <View>
            <AppText variant="caption" color={COLORS.primary} style={styles.bold}>TRACK & HISTORY</AppText>
            <AppText variant="heading">My Orders</AppText>
          </View>
          <Pressable style={styles.helpButton}
            onPress={() => Alert.alert('Help', 'Customer support will be connected later.')}>
            <AppText>?</AppText>
          </Pressable>
        </View>

        <View style={styles.tabs}>
          <Pressable style={[styles.tab, selectedTab === 'active' && styles.activeTab]}
            onPress={() => setSelectedTab('active')}>
            <AppText color={selectedTab === 'active' ? COLORS.white : COLORS.textSecondary}>
              Active ({activeOrders.length})
            </AppText>
          </Pressable>
          <Pressable style={[styles.tab, selectedTab === 'past' && styles.activeTab]}
            onPress={() => setSelectedTab('past')}>
            <AppText color={selectedTab === 'past' ? COLORS.white : COLORS.textSecondary}>
              Past ({pastOrders.length})
            </AppText>
          </Pressable>
        </View>

        {selectedTab === 'active' ? (
          <>
            {activeOrders.length === 0 ? (
              <AppCard>
                <AppText style={styles.center}>You have no active orders.</AppText>
              </AppCard>
            ) : (
              activeOrders.map(order => {
                const currentStage = stages.indexOf(order.status);

                return (
                  <AppCard key={order.id} style={styles.activeOrderCard}>
                    <View style={styles.spaceBetween}>
                      <AppText variant="caption" color={COLORS.primary}>LIVE ORDER  #{order.id.slice(-6)}</AppText>
                      <AppText variant="caption" color={COLORS.success}>● {order.status}</AppText>
                    </View>

                    <AppText variant="subheading">{order.restaurant}</AppText>

                    <View style={styles.etaBox}>
                      <View style={styles.etaIcon}><AppText color={COLORS.white}>◷</AppText></View>
                      <View style={styles.flex}>
                        <AppText variant="caption" color={COLORS.textSecondary}>Estimated arrival</AppText>
                        <AppText style={styles.bold}>
                          {order.eta ? `Arriving in ${order.eta}` : 'Approximately 25–30 mins'}
                        </AppText>
                      </View>
                      <AppText variant="small" color={COLORS.primary}>On the way soon</AppText>
                    </View>

                    <View style={styles.progressContainer}>
                      <View style={styles.progressLine} />
                      {stages.map((stage, index) => (
                        <View key={stage} style={styles.progressStep}>
                          <View style={[
                            styles.progressCircle,
                            index <= currentStage && styles.progressDone,
                            index === currentStage && styles.progressCurrent,
                          ]}>
                            <AppText variant="caption" color={index <= currentStage ? COLORS.white : COLORS.textSecondary}>
                              {index < currentStage ? '✓' : '●'}
                            </AppText>
                          </View>
                          <AppText variant="caption"
                            color={index <= currentStage ? COLORS.primary : COLORS.textSecondary}
                            style={styles.progressLabel}>
                            {stage}
                          </AppText>
                        </View>
                      ))}
                    </View>

                    <View style={styles.riderCard}>
                      <View style={styles.avatar}><AppText>👤</AppText></View>
                      <View style={styles.flex}>
                        <AppText style={styles.bold}>
                          {order.status === 'Confirmed' ? 'Finding your rider' : 'Tariq M.'}
                        </AppText>
                        <AppText variant="caption" color={COLORS.textSecondary}>
                          {order.status === 'Confirmed' ? 'Rider assignment pending' : 'Honda CB 125 · Rider assigned'}
                        </AppText>
                      </View>
                      <AppText color={COLORS.primary}>☎</AppText>
                    </View>

                    <AppText variant="small" color={COLORS.textSecondary}>
                      {order.items.map(item => `${item.quantity}× ${item.name}`).join(', ')}
                    </AppText>
                    <View style={styles.spaceBetween}>
                      <AppText variant="small" color={COLORS.textSecondary}>Total Paid / Due</AppText>
                      <AppText style={styles.bold}>{money(order.total)}</AppText>
                    </View>

                    <AppButton title="⌖  Track Order (Live Map)"
                      onPress={() => Alert.alert('Live Tracking', 'Map tracking is not connected in this demo.')} />

                    <View style={styles.actionRow}>
                      <Pressable style={styles.actionButton} onPress={() => handleCancel(order.id)}>
                        <AppText variant="small">Cancel Order</AppText>
                      </Pressable>
                      <Pressable style={styles.actionButton}
                        onPress={() => Alert.alert('Need Help?', 'Support integration is coming later.')}>
                        <AppText variant="small">Need Help?</AppText>
                      </Pressable>
                    </View>
                  </AppCard>
                );
              })
            )}

            <View style={styles.sectionHeader}>
              <AppText style={styles.sectionHeading}>Previous orders</AppText>
              <Pressable onPress={() => setSelectedTab('past')}>
                <AppText variant="small" color={COLORS.primary}>View all ({pastOrders.length})</AppText>
              </Pressable>
            </View>
            {pastOrders.slice(0, 2).map(renderPastOrder)}
          </>
        ) : (
          <>
            <AppText style={styles.sectionHeading}>Order History</AppText>
            {pastOrders.length === 0 ? (
              <AppCard><AppText style={styles.center}>No previous orders yet.</AppText></AppCard>
            ) : pastOrders.map(renderPastOrder)}
          </>
        )}
      </ScrollView>

      <View style={styles.bottomNav}>
        <Pressable style={styles.navItem} onPress={() => navigation.popTo(routes.HOME)}>
          <AppText style={styles.navIcon} color={COLORS.textSecondary}>⌂</AppText>
          <AppText variant="caption" color={COLORS.textSecondary}>Home</AppText>
        </Pressable>
        <Pressable style={styles.navItem}
          onPress={() => Alert.alert('Search', 'The Search screen has not been added yet.')}>
          <AppText style={styles.navIcon} color={COLORS.textSecondary}>⌕</AppText>
          <AppText variant="caption" color={COLORS.textSecondary}>Search</AppText>
        </Pressable>
        <Pressable style={styles.navItem} onPress={() => setSelectedTab('active')}>
          <AppText style={styles.navIcon} color={COLORS.primary}>▣</AppText>
          <AppText variant="caption" color={COLORS.primary}>Orders</AppText>
        </Pressable>
        <Pressable style={styles.navItem}
          onPress={() => Alert.alert('Profile', 'The Profile screen has not been added yet.')}>
          <AppText style={styles.navIcon} color={COLORS.textSecondary}>♙</AppText>
          <AppText variant="caption" color={COLORS.textSecondary}>Profile</AppText>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#F8F9FC' },
  content: { padding: 18, paddingBottom: 35 },
  flex: { flex: 1, gap: 3 },
  bold: { fontWeight: '700' },
  center: { textAlign: 'center' },
  row: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  spaceBetween: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  helpButton: { width: 38, height: 38, borderRadius: 20, backgroundColor: COLORS.white, borderWidth: 1, borderColor: COLORS.border, alignItems: 'center', justifyContent: 'center' },
  tabs: { flexDirection: 'row', backgroundColor: '#E9EDF3', padding: 4, borderRadius: 15, marginBottom: 16 },
  tab: { flex: 1, padding: 12, alignItems: 'center', borderRadius: 12 },
  activeTab: { backgroundColor: COLORS.primary },
  activeOrderCard: { borderColor: '#FFE4CE', borderRadius: 20, gap: 14 },
  etaBox: { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: '#FFF9EF', padding: 12, borderRadius: 12 },
  etaIcon: { width: 32, height: 32, borderRadius: 18, backgroundColor: COLORS.primary, alignItems: 'center', justifyContent: 'center' },
  progressContainer: { flexDirection: 'row', justifyContent: 'space-between', marginVertical: 10, position: 'relative' },
  progressLine: { position: 'absolute', height: 3, backgroundColor: COLORS.border, left: 25, right: 25, top: 12 },
  progressStep: { flex: 1, alignItems: 'center', gap: 5 },
  progressCircle: { width: 26, height: 26, borderRadius: 14, backgroundColor: '#E4E8EF', alignItems: 'center', justifyContent: 'center' },
  progressDone: { backgroundColor: COLORS.primary },
  progressCurrent: { borderWidth: 3, borderColor: '#FFB8A4' },
  progressLabel: { textAlign: 'center' },
  riderCard: { flexDirection: 'row', gap: 10, alignItems: 'center', backgroundColor: '#F7F9FC', borderRadius: 12, padding: 12 },
  avatar: { width: 35, height: 35, borderRadius: 20, backgroundColor: '#E7EDFC', alignItems: 'center', justifyContent: 'center' },
  actionRow: { flexDirection: 'row', gap: 10 },
  actionButton: { flex: 1, backgroundColor: '#F7F9FC', borderRadius: 10, borderWidth: 1, borderColor: COLORS.border, padding: 12, alignItems: 'center' },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 14, marginBottom: 12 },
  sectionHeading: { fontWeight: '700', fontSize: 16, marginBottom: 10 },
  previousCard: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 10, padding: 12 },
  previousImage: { width: 55, height: 55, borderRadius: 12, backgroundColor: COLORS.inputBackground },
  reorderButton: { padding: 8, borderRadius: 10, borderWidth: 1, borderColor: '#FFD0C3', backgroundColor: COLORS.primaryLight },
  bottomNav: { flexDirection: 'row', backgroundColor: COLORS.white, borderTopWidth: 1, borderTopColor: COLORS.border, paddingVertical: 9 },
  navItem: { flex: 1, alignItems: 'center', gap: 3 },
  navIcon: { fontSize: 24 },
});
