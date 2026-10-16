import React from 'react';
import { Alert, Image, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import AppButton from '../../components/AppButton';
import AppCard from '../../components/AppCard';
import AppText from '../../components/AppText';
import { useShop } from '../../state/ShopContext';
import { COLORS } from '../../theme/colors';
import { routes } from '../../navigation/routes';

const money = value => `Rs. ${value.toLocaleString('en-PK')}`;
const instructions = ['Leave at doorstep', 'Call on arrival', 'Do not ring'];

export default function CartScreen({ navigation }) {
    const {
        cart, subtotal, discount, platformFee, deliveryFee, cartTotal,
        promoApplied, setPromoApplied, instruction, setInstruction,
        changeQuantity, removeItem, clearCart,
    } = useShop();

    const itemCount = cart.reduce((sum, item) => sum + item.quantity, 0);

    function handleClear() {
        Alert.alert('Clear Cart', 'Remove all items from your cart?', [
            { text: 'Cancel' },
            { text: 'Clear', onPress: clearCart },
        ]);
    }

    return (
        <SafeAreaView style={styles.screen}>
            <View style={styles.header}>
                <Pressable style={styles.circleButton} onPress={() => navigation.goBack()}>
                    <AppText style={styles.headerIcon}>‹</AppText>
                </Pressable>
                <View style={styles.headerTitle}>
                    <AppText variant="subheading">Your Cart</AppText>
                    <AppText variant="small" color={COLORS.textSecondary}>{itemCount} items added</AppText>
                </View>
                <Pressable style={styles.circleButton} onPress={handleClear}>
                    <AppText style={styles.headerIcon}>×</AppText>
                </Pressable>
            </View>

            <ScrollView contentContainerStyle={styles.content}>
                <AppCard style={styles.restaurantCard}>
                    <View style={styles.restaurantLogo}><AppText color={COLORS.primary}>UB</AppText></View>
                    <View style={styles.flex}>
                        <AppText style={styles.bold}>Urban Bites</AppText>
                        <AppText variant="caption" color={COLORS.textSecondary}>⌖ Johar Town, Lahore</AppText>
                    </View>
                    <View style={styles.timeBadge}>
                        <AppText variant="caption" color={COLORS.primary}>◷ 25–30 mins</AppText>
                    </View>
                </AppCard>

                {cart.length === 0 ? (
                    <AppCard>
                        <AppText style={styles.center}>Your cart is empty.</AppText>
                        <AppButton title="Browse Food" onPress={() => navigation.popTo(routes.HOME)} />
                    </AppCard>
                ) : (
                    cart.map(item => (
                        <AppCard key={item.id} style={styles.itemCard}>
                            <View style={styles.itemRow}>
                                <Image source={{ uri: item.image }} style={styles.foodImage} />
                                <View style={styles.flex}>
                                    <AppText style={styles.bold}>🟢 {item.name}</AppText>
                                    <AppText variant="small" color={COLORS.textSecondary}>{item.subtitle}</AppText>
                                    <AppText variant="small" color={COLORS.warning}>★ {item.rating}
                                        <AppText variant="small" color={COLORS.textSecondary}>  ·  {item.option}</AppText>
                                    </AppText>
                                </View>
                                <Pressable onPress={() => removeItem(item.id)} style={styles.removeButton}>
                                    <AppText color={COLORS.textSecondary}>×</AppText>
                                </Pressable>
                            </View>

                            <View style={styles.itemBottom}>
                                <View>
                                    <AppText variant="caption" color={COLORS.textSecondary}>Unit: {money(item.price)}</AppText>
                                    <AppText color={COLORS.primary} style={styles.bold}>
                                        {money(item.price * item.quantity)}
                                    </AppText>
                                </View>
                                <View style={styles.quantityBox}>
                                    <Pressable style={styles.quantityButton} onPress={() => changeQuantity(item.id, -1)}>
                                        <AppText>−</AppText>
                                    </Pressable>
                                    <AppText style={styles.quantity}>{item.quantity}</AppText>
                                    <Pressable style={styles.plusButton} onPress={() => changeQuantity(item.id, 1)}>
                                        <AppText color={COLORS.white}>+</AppText>
                                    </Pressable>
                                </View>
                            </View>
                        </AppCard>
                    ))
                )}

                <Pressable style={styles.addMore} onPress={() => navigation.popTo(routes.HOME)}>
                    <AppText color={COLORS.primary}>＋ Add more items from Urban Bites</AppText>
                </Pressable>

                <AppCard>
                    <View style={styles.spaceBetween}>
                        <AppText style={styles.sectionTitle}>◷  DELIVERY INSTRUCTIONS</AppText>
                        <AppText variant="caption" color={COLORS.primary}>Optional</AppText>
                    </View>
                    <View style={styles.chipRow}>
                        {instructions.map(option => (
                            <Pressable key={option} onPress={() => setInstruction(option)}
                                style={[styles.chip, instruction === option && styles.selectedChip]}>
                                <AppText variant="caption" color={instruction === option ? COLORS.primary : COLORS.textSecondary}>
                                    {option}
                                </AppText>
                            </Pressable>
                        ))}
                    </View>
                </AppCard>

                <Pressable style={styles.promoCard} onPress={() => setPromoApplied(!promoApplied)}>
                    <View style={styles.promoIcon}><AppText color={COLORS.primary}>◇</AppText></View>
                    <View style={styles.flex}>
                        <AppText style={styles.bold}>FOODMIND50 {promoApplied ? '✓' : ''}</AppText>
                        <AppText variant="caption" color={COLORS.textSecondary}>
                            {promoApplied ? `You saved ${money(discount)} with this promo` : 'Tap to apply your promo'}
                        </AppText>
                    </View>
                    <AppText variant="small" color={COLORS.primary}>{promoApplied ? 'Remove' : 'Apply'}</AppText>
                </Pressable>

                <AppCard>
                    <AppText style={styles.sectionTitle}>BILL SUMMARY</AppText>
                    <View style={styles.billRow}>
                        <AppText color={COLORS.textSecondary}>Item Total</AppText>
                        <AppText>{money(subtotal)}</AppText>
                    </View>
                    <View style={styles.billRow}>
                        <AppText color={COLORS.textSecondary}>Delivery Partner Fee</AppText>
                        <AppText>{money(deliveryFee)}</AppText>
                    </View>
                    <View style={styles.billRow}>
                        <AppText color={COLORS.textSecondary}>Platform Fee</AppText>
                        <AppText>{money(platformFee)}</AppText>
                    </View>
                    <View style={styles.billRow}>
                        <AppText color={COLORS.success}>Voucher Discount</AppText>
                        <AppText color={COLORS.success}>− {money(discount)}</AppText>
                    </View>
                    <View style={styles.totalRow}>
                        <AppText style={styles.bold}>To Pay</AppText>
                        <AppText variant="subheading">{money(cartTotal)}</AppText>
                    </View>
                    <AppText variant="caption" color={COLORS.textSecondary}>Inclusive of all taxes</AppText>
                </AppCard>
            </ScrollView>

            <View style={styles.footer}>
                <View>
                    <AppText variant="caption" color={COLORS.white}>TOTAL PAYABLE</AppText>
                    <AppText variant="subheading" color={COLORS.white}>{money(cartTotal)}</AppText>
                </View>
                <Pressable disabled={cart.length === 0} onPress={() => navigation.navigate(routes.CHECKOUT)}>
                    <AppText color={COLORS.white} style={styles.bold}>Proceed to Checkout  →</AppText>
                </Pressable>
            </View>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    screen: {
        flex: 1,
        backgroundColor: COLORS.background
    },

    flex: {
        flex: 1,
        gap: 4
    },

    bold: { fontWeight: '700' },
    center: { textAlign: 'center', marginBottom: 12 },
    header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 16 },
    headerTitle: { alignItems: 'center' },
    circleButton: { width: 38, height: 38, backgroundColor: COLORS.white, borderRadius: 20, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: COLORS.border },
    headerIcon: { fontSize: 25 },
    content: { paddingHorizontal: 16, paddingBottom: 24 },
    restaurantCard: { flexDirection: 'row', alignItems: 'center', gap: 10 },
    restaurantLogo: { width: 44, height: 44, borderRadius: 12, backgroundColor: COLORS.primaryLight, alignItems: 'center', justifyContent: 'center' },
    timeBadge: { borderWidth: 1, borderColor: '#FFDDB0', backgroundColor: '#FFF9ED', padding: 7, borderRadius: 20 },
    itemCard: { gap: 14 },
    itemRow: { flexDirection: 'row', gap: 10, alignItems: 'flex-start' },
    foodImage: { width: 76, height: 76, borderRadius: 12, backgroundColor: COLORS.primaryLight },
    removeButton: { paddingHorizontal: 6 },
    itemBottom: { borderTopWidth: 1, borderTopColor: COLORS.border, paddingTop: 12, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    quantityBox: { flexDirection: 'row', alignItems: 'center', gap: 12, borderRadius: 10, borderWidth: 1, borderColor: COLORS.border, padding: 3 },
    quantityButton: { backgroundColor: COLORS.inputBackground, borderRadius: 8, width: 30, height: 30, alignItems: 'center', justifyContent: 'center' },
    plusButton: { backgroundColor: COLORS.primary, borderRadius: 8, width: 30, height: 30, alignItems: 'center', justifyContent: 'center' },
    quantity: { fontWeight: '700', minWidth: 12, textAlign: 'center' },
    addMore: { padding: 13, borderWidth: 1, borderColor: COLORS.primary, borderStyle: 'dashed', borderRadius: 12, alignItems: 'center', marginBottom: 15 },
    spaceBetween: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    sectionTitle: { fontWeight: '700', fontSize: 13 },
    chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 7 },
    chip: { padding: 8, borderRadius: 8, backgroundColor: COLORS.inputBackground, borderWidth: 1, borderColor: COLORS.border },
    selectedChip: { borderColor: COLORS.primary, backgroundColor: COLORS.primaryLight },
    promoCard: { flexDirection: 'row', alignItems: 'center', gap: 10, borderRadius: 14, backgroundColor: '#FFF9ED', padding: 14, borderWidth: 1, borderColor: '#FFDEBC', marginBottom: 14 },
    promoIcon: { width: 35, height: 35, alignItems: 'center', justifyContent: 'center', borderRadius: 10, backgroundColor: COLORS.primaryLight },
    billRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 7 },
    totalRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', borderTopWidth: 1, borderTopColor: COLORS.border, paddingTop: 12, marginTop: 10 },
    footer: { backgroundColor: COLORS.primary, padding: 17, margin: 14, borderRadius: 15, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', elevation: 5 },
});
