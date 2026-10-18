import React, { useState } from 'react';
import { View, Image, Pressable, FlatList, ScrollView, Switch, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import AppText from '../../components/AppText';
import AppButton from '../../components/AppButton';
import AppCard from '../../components/AppCard';
import SearchBar from '../../components/SearchBar';
import classicSmash from '../../assets/order-1034.png';
import fireBurger from '../../assets/Fire Burger.png';
import loadedFries from '../../assets/Loaded Fries.png';
import chickenWrap from '../../assets/ChickenWrap.png';
import FilterIcon from '../../assets/icons/filter-slider-icon.svg';
import EditIcon from '../../assets/icons/edit-button.svg';
import { COLORS } from '../../theme/colors';
import { SPACING, RADIUS } from '../../theme/spacing';

const CATEGORIES = ['Burgers', 'Sides', 'Drinks', 'Desserts'];

const INITIAL_ITEMS = [
    { id: '1', name: 'Classic Smash', desc: 'Double patty & cheddar', price: 890, category: 'Burgers', image: classicSmash, available: true },
    { id: '2', name: 'Fire Burger', desc: 'Jalapeños & spicy mayo', price: 820, category: 'Burgers', image: fireBurger, available: true },
    { id: '3', name: 'Loaded Fries', desc: 'Cheese sauce & beef bits', price: 420, category: 'Sides', image: loadedFries, available: true },
    { id: '4', name: 'Chicken Wrap', desc: 'Tortilla, grilled strips', price: 650, category: 'Sides', image: chickenWrap, available: false },
];

function MenuItemCard({ item, onToggle, onEdit }) {
    const outOfStock = !item.available;

    return (
        <AppCard style={[styles.card, outOfStock && styles.cardOff]}>
            <View style={styles.thumb}>
                <Image source={item.image} style={styles.thumbImage} />
                <View style={[styles.tag, outOfStock ? styles.stockTag : styles.categoryTag]}>
                    <AppText variant="caption" color={COLORS.white} style={styles.tagText}>
                        {outOfStock ? 'OUT OF STOCK' : item.category}
                    </AppText>
                </View>
            </View>

            <View style={styles.info}>
                <View style={styles.topRow}>
                    <View style={styles.titleBlock}>
                        <AppText style={[styles.name, outOfStock && styles.textOff]}>{item.name}</AppText>
                        <AppText variant="small" color={COLORS.textSecondary} style={styles.desc}>
                            {item.desc}
                        </AppText>
                    </View>
                    <Pressable onPress={() => onEdit?.(item.id)} style={styles.editButton}>
                        <EditIcon width={28} height={29} color={COLORS.primary} />
                    </Pressable>
                </View>

                <View style={styles.divider} />

                <AppText variant="small" color={COLORS.textSecondary}>Price</AppText>
                <View style={styles.bottomRow}>
                    <AppText style={[styles.price, outOfStock && styles.textOff]}>Rs. {item.price}</AppText>
                    <AppText
                        variant="small"
                        style={[styles.status, { color: outOfStock ? COLORS.textSecondary : COLORS.success }]}
                    >
                        {outOfStock ? 'Unavailable' : 'Available'}
                    </AppText>
                    <Switch
                        value={item.available}
                        onValueChange={() => onToggle(item.id)}
                        trackColor={{ false: COLORS.border, true: COLORS.success }}
                        thumbColor={COLORS.white}
                    />
                </View>
            </View>
        </AppCard>
    );
}

export default function ManageMenuScreen({ onBack, onAddItem, onEditItem }) {
    const [items, setItems] = useState(INITIAL_ITEMS);
    const [category, setCategory] = useState('All');
    const [query, setQuery] = useState('');

    const toggle = (id) =>
        setItems((prev) => prev.map((i) => (i.id === id ? { ...i, available: !i.available } : i)));

    const visible = items.filter(
        (i) =>
            (category === 'All' || i.category === category) &&
            i.name.toLowerCase().includes(query.trim().toLowerCase())
    );

    return (
        <SafeAreaView style={styles.screen} edges={['top']}>
            {/* Header */}
            <View style={styles.header}>
                <Pressable style={styles.circleButton} onPress={onBack}>
                    <AppText style={styles.backText}>‹</AppText>
                </Pressable>
                <View style={styles.headerText}>
                    <AppText style={styles.title}>Manage Menu</AppText>
                    <AppText variant="small" color={COLORS.textSecondary} style={styles.subtitle}>
                        The Burger Lab • {CATEGORIES.length} Categories
                    </AppText>
                </View>
                <View style={styles.circleButton}>
                    <FilterIcon width={20} height={20} color={COLORS.text} />
                </View>
            </View>

            {/* Search */}
            <SearchBar placeholder="Search menu items..." value={query} onChangeText={setQuery} />

            {/* Category chips */}
            <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                style={styles.chipsWrap}
                contentContainerStyle={styles.chips}
            >
                {['All', ...CATEGORIES].map((c) => {
                    const active = c === category;
                    return (
                        <Pressable
                            key={c}
                            onPress={() => setCategory(c)}
                            style={[styles.chip, active && styles.chipActive]}
                        >
                            <AppText style={[styles.chipText, active && styles.chipTextActive]}>
                                {c === 'All' ? `All (${items.length})` : c}
                            </AppText>
                        </Pressable>
                    );
                })}
            </ScrollView>

            {/* List */}
            <FlatList
                data={visible}
                keyExtractor={(i) => i.id}
                style={styles.flex}
                contentContainerStyle={styles.list}
                showsVerticalScrollIndicator={false}
                renderItem={({ item }) => (
                    <MenuItemCard item={item} onToggle={toggle} onEdit={onEditItem} />
                )}
                ListEmptyComponent={
                    <AppText color={COLORS.textSecondary} style={styles.empty}>No items found</AppText>
                }
            />

            {/* Add button */}
            <View style={styles.footer}>
                <AppButton title="+  Add New Item" onPress={onAddItem} style={styles.addButton} />
            </View>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    screen: { flex: 1, backgroundColor: COLORS.background },
    flex: { flex: 1 },

    // Header
    header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: SPACING.xl, paddingTop: SPACING.md, marginBottom: SPACING.lg },
    circleButton: {
        width: 44,
        height: 44,
        borderRadius: RADIUS.pill,
        backgroundColor: COLORS.white,
        borderWidth: 1,
        borderColor: COLORS.border,
        alignItems: 'center',
        justifyContent: 'center',
    },
    backText: { fontSize: 30, lineHeight: 32, color: COLORS.text, marginTop: -4, marginLeft: -2 },
    headerText: { flex: 1, marginLeft: 14 },
    title: { fontSize: 26, lineHeight: 34, fontWeight: '800', color: COLORS.text },
    subtitle: { marginTop: 2 },

    // Category chips
    chipsWrap: { marginTop: SPACING.lg, flexGrow: 0 },
    chips: { paddingHorizontal: SPACING.xl, paddingVertical: SPACING.xs },
    chip: {
        paddingHorizontal: SPACING.xl,
        paddingVertical: 10,
        borderRadius: 22,
        backgroundColor: COLORS.white,
        borderWidth: 1,
        borderColor: COLORS.border,
        marginRight: 10,
    },
    chipActive: { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
    chipText: { fontSize: 16, fontWeight: '600', color: COLORS.text },
    chipTextActive: { color: COLORS.white },

    // List
    list: { paddingHorizontal: SPACING.xl, paddingTop: SPACING.lg, paddingBottom: SPACING.lg },
    empty: { textAlign: 'center', marginTop: 40 },

    card: { flexDirection: 'row', padding: SPACING.md, borderRadius: 24, marginBottom: 14 },
    cardOff: { opacity: 0.75 },
    thumb: {
        width: 94,
        height: 94,
        borderRadius: 18,
        backgroundColor: COLORS.inputBackground,
        overflow: 'hidden',
    },
    thumbImage: { width: '100%', height: '100%' },
    tag: { position: 'absolute', left: 6, paddingVertical: 3 },
    categoryTag: { top: 6, paddingHorizontal: 8, borderRadius: 8, backgroundColor: COLORS.text },
    stockTag: { bottom: 8, paddingHorizontal: 6, borderRadius: 6, backgroundColor: COLORS.danger },
    tagText: { fontWeight: '600' },

    info: { flex: 1, marginLeft: 14 },
    topRow: { flexDirection: 'row', alignItems: 'flex-start' },
    titleBlock: { flex: 1 },
    name: { fontSize: 18, fontWeight: '800', color: COLORS.text },
    desc: { marginTop: 2 },
    textOff: { color: COLORS.textSecondary },
    editButton: { width: 32, height: 32, alignItems: 'center', justifyContent: 'center' },
    divider: { height: StyleSheet.hairlineWidth, backgroundColor: COLORS.border, marginVertical: SPACING.sm },
    bottomRow: { flexDirection: 'row', alignItems: 'center' },
    price: { flex: 1, fontSize: 18, fontWeight: '800', color: COLORS.primary },
    status: { fontWeight: '600', marginRight: 6 },

    // Footer
    footer: { paddingHorizontal: SPACING.xl, paddingTop: SPACING.md, paddingBottom: SPACING.lg, backgroundColor: COLORS.white },
    addButton: { height: 56, borderRadius: 20 },
});
