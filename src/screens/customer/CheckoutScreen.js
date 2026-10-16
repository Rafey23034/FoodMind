
import React, { useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import AppButton from '../../components/AppButton';
import AppCard from '../../components/AppCard';
import AppInput from '../../components/AppInput';
import AppText from '../../components/AppText';
import { useShop } from '../../state/ShopContext';
import { COLORS } from '../../theme/colors';
import { routes } from '../../navigation/routes';

const money = value => `Rs. ${value.toLocaleString('en-PK')}`;

const paymentMethods = [
  { id: 'cash', icon: '▣', title: 'Cash on Delivery', subtitle: 'Pay exact amount to rider' },
  { id: 'card', icon: '▤', title: 'Credit / Debit Card', subtitle: 'VISA  ·  Mastercard' },
  { id: 'wallet', icon: '▯', title: 'EasyPaisa / JazzCash', subtitle: 'Instant direct wallet transfer' },
];

export default function CheckoutScreen({ navigation }) {
  const { cart, subtotal, discount, platformFee, deliveryFee, instruction, placeOrder } = useShop();
  const [address, setAddress] = useState('House 42, Block G, Johar Town, Lahore');
  const [deliveryMode, setDeliveryMode] = useState('priority');
  const [payment, setPayment] = useState('cash');
  const [tip, setTip] = useState(50);
  const [customTip, setCustomTip] = useState('');

  const deliveryCost = cart.length === 0 ? 0 : deliveryMode === 'priority' ? deliveryFee : 100;
  const tipAmount = tip === 'custom' ? Math.max(0, Number(customTip) || 0) : tip;
  const total = subtotal + deliveryCost + platformFee - discount + tipAmount;

  function handlePlaceOrder() {
    if (cart.length === 0) return Alert.alert('Empty Cart', 'Add items before placing an order.');
    if (payment !== 'cash') {
      return Alert.alert('Demo Only', 'Online payments are not connected. Please select Cash on Delivery.');
    }

    const order = placeOrder({ address, deliveryMode, payment, tip: tipAmount, total, instruction });
    if (order) {
      navigation.reset({
        index: 1,
        routes: [{ name: routes.HOME }, { name: routes.ORDERS }],
      });
    }
  }

  return (
    <SafeAreaView style={styles.screen}>
      <View style={styles.header}>
        <Pressable style={styles.circleButton} onPress={() => navigation.goBack()}>
          <AppText style={styles.backArrow}>‹</AppText>
        </Pressable>
        <AppText variant="subheading">Checkout</AppText>
        <Pressable style={styles.circleButton}
          onPress={() => Alert.alert('Checkout', 'Confirm your delivery and payment preferences.')}>
          <AppText>?</AppText>
        </Pressable>
      </View>

      <View style={styles.stepRow}>
        <AppText variant="small" color={COLORS.textSecondary}>✓ Cart</AppText>
        <View style={styles.stepLine} />
        <AppText variant="small" color={COLORS.textSecondary}>✓ Delivery</AppText>
        <View style={styles.stepLine} />
        <AppText variant="small" color={COLORS.primary}>● Payment</AppText>
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        <AppCard>
          <View style={styles.row}>
            <View style={styles.addressIcon}><AppText color={COLORS.primary}>⌖</AppText></View>
            <View style={styles.flex}>
              <AppText variant="caption" color={COLORS.textSecondary}>DELIVERING TO</AppText>
              <AppText style={styles.bold}>Home</AppText>
            </View>
            <Pressable onPress={() => setAddress(previous =>
              previous.startsWith('House 42') ? 'University Campus, Lahore' : 'House 42, Block G, Johar Town, Lahore'
            )}>
              <AppText variant="small" color={COLORS.primary}>Change</AppText>
            </Pressable>
          </View>
          <View style={styles.separator} />
          <AppText>{address}</AppText>
          <View style={styles.noteBox}>
            <AppText variant="small" color={COLORS.textSecondary}>▣ {instruction}</AppText>
          </View>
        </AppCard>

        <AppText style={styles.heading}>Delivery Time</AppText>
        <View style={styles.deliveryRow}>
          <Pressable onPress={() => setDeliveryMode('priority')}
            style={[styles.deliveryOption, deliveryMode === 'priority' && styles.optionSelected]}>
            <View style={styles.spaceBetween}>
              <AppText style={styles.bold}>⚡ ASAP</AppText>
              <AppText color={deliveryMode === 'priority' ? COLORS.primary : COLORS.textSecondary}>
                {deliveryMode === 'priority' ? '◉' : '◯'}
              </AppText>
            </View>
            <AppText style={styles.bold}>Priority (25–30 min)</AppText>
            <AppText variant="caption" color={COLORS.primary}>Fastest delivery</AppText>
          </Pressable>

          <Pressable onPress={() => setDeliveryMode('later')}
            style={[styles.deliveryOption, deliveryMode === 'later' && styles.optionSelected]}>
            <View style={styles.spaceBetween}>
              <AppText style={styles.bold}>▦ Later</AppText>
              <AppText color={deliveryMode === 'later' ? COLORS.primary : COLORS.textSecondary}>
                {deliveryMode === 'later' ? '◉' : '◯'}
              </AppText>
            </View>
            <AppText style={styles.bold}>Standard Delivery</AppText>
            <AppText variant="caption" color={COLORS.textSecondary}>35–45 min (demo)</AppText>
          </Pressable>
        </View>

        <View style={styles.spaceBetween}>
          <AppText style={styles.heading}>Payment Method</AppText>
          <AppText variant="small" color={COLORS.success}>♢ 100% Secure</AppText>
        </View>
        <AppCard style={styles.paymentCard}>
          {paymentMethods.map(method => (
            <Pressable key={method.id} onPress={() => setPayment(method.id)} style={styles.paymentRow}>
              <View style={styles.paymentIcon}>
                <AppText color={COLORS.primary}>{method.icon}</AppText>
              </View>
              <View style={styles.flex}>
                <AppText style={styles.bold}>{method.title}</AppText>
                <AppText variant="caption" color={COLORS.textSecondary}>{method.subtitle}</AppText>
              </View>
              <AppText color={payment === method.id ? COLORS.primary : COLORS.textSecondary}>
                {payment === method.id ? '◉' : '◯'}
              </AppText>
            </Pressable>
          ))}
          <Pressable style={styles.addPayment}
            onPress={() => Alert.alert('Coming Soon', 'Adding payment methods requires a payment integration.')}>
            <AppText color={COLORS.primary}>＋ Add new payment method</AppText>
          </Pressable>
        </AppCard>

        <AppCard>
          <AppText style={styles.heading}>Tip your Delivery Hero</AppText>
          <AppText variant="caption" color={COLORS.textSecondary}>100% of this goes to your delivery partner</AppText>
          <View style={styles.tipRow}>
            {[50, 100, 200, 'custom'].map(value => (
              <Pressable key={value} onPress={() => setTip(value)}
                style={[styles.tipButton, tip === value && styles.tipSelected]}>
                <AppText variant="small" color={tip === value ? COLORS.primary : COLORS.text}>
                  {value === 'custom' ? 'Custom' : money(value)}
                </AppText>
              </Pressable>
            ))}
          </View>
          {tip === 'custom' ? (
            <AppInput label="CUSTOM TIP" value={customTip} onChangeText={setCustomTip}
              keyboardType="numeric" placeholder="Enter amount in Rs." />
          ) : null}
        </AppCard>

        <AppCard>
          <AppText style={styles.heading}>Order Summary</AppText>
          <View style={styles.separator} />
          <View style={styles.billRow}>
            <AppText color={COLORS.textSecondary}>Subtotal</AppText>
            <AppText>{money(subtotal)}</AppText>
          </View>
          <View style={styles.billRow}>
            <AppText color={COLORS.textSecondary}>Delivery Fee</AppText>
            <AppText>{money(deliveryCost)}</AppText>
          </View>
          <View style={styles.billRow}>
            <AppText color={COLORS.textSecondary}>Platform Fee</AppText>
            <AppText>{money(platformFee)}</AppText>
          </View>
          <View style={styles.billRow}>
            <AppText color={COLORS.success}>Promo Discount</AppText>
            <AppText color={COLORS.success}>− {money(discount)}</AppText>
          </View>
          <View style={styles.billRow}>
            <AppText color={COLORS.textSecondary}>Rider Tip</AppText>
            <AppText>{money(tipAmount)}</AppText>
          </View>
          <View style={styles.separator} />
          <View style={styles.spaceBetween}>
            <AppText style={styles.bold}>Total Amount</AppText>
            <AppText variant="subheading">{money(total)}</AppText>
          </View>
          <AppText variant="caption" color={COLORS.textSecondary}>Inclusive of all local taxes</AppText>
        </AppCard>
      </ScrollView>

      <View style={styles.footer}>
        <AppText variant="caption" color={COLORS.success} style={styles.footerNote}>
          ♢ Safe & contactless delivery available
        </AppText>
        <AppButton title={`Place Order     |     ${money(total)}   ›`}
          onPress={handlePlaceOrder} disabled={cart.length === 0} style={styles.placeButton} />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: COLORS.background },
  flex: { flex: 1, gap: 3 },
  bold: { fontWeight: '700' },
  heading: { fontSize: 15, fontWeight: '700', marginBottom: 10 },
  header: { padding: 16, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  circleButton: { width: 38, height: 38, borderRadius: 20, backgroundColor: COLORS.white, borderColor: COLORS.border, borderWidth: 1, justifyContent: 'center', alignItems: 'center' },
  backArrow: { fontSize: 26 },
  stepRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 12, marginBottom: 14 },
  stepLine: { width: 26, height: 2, backgroundColor: COLORS.primary },
  content: { paddingHorizontal: 16, paddingBottom: 25 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  addressIcon: { width: 35, height: 35, backgroundColor: COLORS.primaryLight, borderRadius: 20, justifyContent: 'center', alignItems: 'center' },
  separator: { height: 1, backgroundColor: COLORS.border, marginVertical: 10 },
  noteBox: { backgroundColor: COLORS.inputBackground, borderRadius: 10, padding: 12 },
  deliveryRow: { flexDirection: 'row', gap: 10, marginBottom: 20 },
  deliveryOption: { flex: 1, backgroundColor: COLORS.white, borderRadius: 14, borderWidth: 1, borderColor: COLORS.border, padding: 12, gap: 6 },
  optionSelected: { borderColor: COLORS.primary, borderWidth: 2, backgroundColor: COLORS.primaryLight },
  spaceBetween: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  paymentCard: { padding: 0 },
  paymentRow: { flexDirection: 'row', alignItems: 'center', gap: 10, padding: 13, borderBottomWidth: 1, borderBottomColor: COLORS.border },
  paymentIcon: { width: 36, height: 36, borderRadius: 9, backgroundColor: COLORS.primaryLight, justifyContent: 'center', alignItems: 'center' },
  addPayment: { padding: 13, alignItems: 'center' },
  tipRow: { flexDirection: 'row', gap: 7, marginTop: 14 },
  tipButton: { flex: 1, paddingVertical: 10, alignItems: 'center', borderRadius: 10, borderWidth: 1, borderColor: COLORS.border },
  tipSelected: { borderColor: COLORS.primary, backgroundColor: COLORS.primaryLight, borderWidth: 2 },
  billRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginVertical: 5 },
  footer: { backgroundColor: COLORS.white, borderTopWidth: 1, borderTopColor: COLORS.border, padding: 14 },
  footerNote: { textAlign: 'center', marginBottom: 10 },
  placeButton: { height: 55 },
});
