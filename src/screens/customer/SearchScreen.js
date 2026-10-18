import React, { useState, useMemo } from 'react';
import { View, Text, Pressable, Image, StyleSheet, ScrollView, FlatList } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Header from '../../components/Header';
import SearchBar from '../../components/SearchBar';
import FilterIcon from '../../assets/icons/filter-slider-icon.svg';
import { SEARCH_DISHES } from '../../data/searchDishes';
import { COLORS } from '../../theme/colors';


const TABS = ['All', 'Dishes', 'Restaurants', '4.5+'];

export default function SearchScreen() {
    const [activeTab, setActiveTab] = useState('All');
    const [query, setQuery] = useState('');

    const filteredData = useMemo(() => {
        let data = SEARCH_DISHES;

        if (activeTab === '4.5+') {
            data = data.filter(item => item.rating >= 4.5);
        } else if (activeTab === 'Dishes') {
            data = data.filter(item => item.type === 'Dishes');
        } else if (activeTab === 'Restaurants') {
            data = [];
        }

        const q = query.trim().toLowerCase();
        if (q) {
            data = data.filter(
                item =>
                    item.name.toLowerCase().includes(q) ||
                    item.restaurant.toLowerCase().includes(q) ||
                    item.cuisine.toLowerCase().includes(q),
            );
        }

        return data;
    }, [activeTab, query]);

    const renderDish = ({ item }) => (
        <View style={styles.card}>
            <Image source={item.image} style={styles.dishImage} />

            <View style={styles.cardContent}>
                <Text style={styles.title}>{item.name}</Text>
                <Text style={styles.subtitle}>{item.restaurant} • {item.cuisine}</Text>

                <View style={styles.metaRow}>
                    <View style={styles.ratingRow}>
                        <Text style={styles.star}>⭐</Text>
                        <Text style={styles.rating}>{item.rating}</Text>
                        <Text style={styles.reviews}>({item.reviews})</Text>
                    </View>
                    <Text style={styles.price}>Rs. {item.price.toLocaleString()}</Text>
                </View>
            </View>
        </View>
    );

    const AIPromptCard = () => (
        <View style={styles.aiCard}>
            <View style={styles.aiHeader}>
                <View style={styles.sparkleIcon}>
                    <Text style={styles.sparkleText}>✦</Text>
                </View>
                <Text style={styles.aiTitle}>Try FoodMind AI</Text>
            </View>

            <Text style={styles.aiDescription}>
                Looking for something specific?{'\n'}
                Ask AI with natural language prompt.
            </Text>

            <Pressable
                onPress={() => {}}
                style={({ pressed }) => [styles.aiButton, pressed && styles.aiButtonPressed]}
            >
                <Text style={styles.aiButtonText}>Ask AI</Text>
                <Text style={styles.aiButtonArrow}>→</Text>
            </Pressable>
        </View>
    );

    return (
        <SafeAreaView style={styles.container} edges={['top']}>
            <Header onBack={() => null} title={'Search'} centerTitle={true} />

            <SearchBar
                placeholder={'Search Dishes, Restaurants or Cravings'}
                rightIcon={<FilterIcon width={20} height={20} color={COLORS.primary} />}
                value={query}
                onChangeText={setQuery}
            />

            {/* Filter Tabs */}
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.tabsContainer}>
                {TABS.map((tab) => (
                    <Pressable
                        key={tab}
                        style={[styles.tab, activeTab === tab && styles.activeTab]}
                        onPress={() => setActiveTab(tab)}
                    >
                        <Text style={[styles.tabText, activeTab === tab && styles.activeTabText]}>
                            {tab}
                        </Text>
                    </Pressable>
                ))}
            </ScrollView>

            {/* Results Header */}
            <View style={styles.resultsHeader}>
                <Text style={styles.countText}>{filteredData.length} RESULTS FOUND</Text>
            </View>

            {/* The List */}
            <FlatList
                data={filteredData}
                keyExtractor={(item) => item.id}
                renderItem={renderDish}
                contentContainerStyle={styles.listContent}
                showsVerticalScrollIndicator={false}
                ListEmptyComponent={
                    <View style={styles.emptyState}>
                        <Text style={styles.emptyTitle}>No results</Text>
                        <Text style={styles.emptySubtitle}>Try a different search or filter</Text>
                    </View>
                }
                ListFooterComponent={AIPromptCard}
            />
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: COLORS.background },

    // Tabs
    tabsContainer: { paddingHorizontal: 20, marginTop: 10, maxHeight: 40 },
    tab: {
        paddingHorizontal: 16, paddingVertical: 8, marginRight: 10,
        borderRadius: 20, backgroundColor: COLORS.white, borderWidth: 1, borderColor: COLORS.border
    },
    activeTab: { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
    tabText: { color: COLORS.text, fontWeight: '500' },
    activeTabText: { color: COLORS.white },

    // Results Header
    resultsHeader: { paddingHorizontal: 20, marginTop: 15, marginBottom: 10, flexDirection: 'row', justifyContent: 'space-between' },
    countText: { fontSize: 12, color: COLORS.textSecondary, fontWeight: '700' },

    // List & Cards
    listContent: { paddingHorizontal: 20, paddingBottom: 20 },
    card: {
        flexDirection: 'row',
        backgroundColor: COLORS.white,
        padding: 12,
        borderRadius: 16,
        marginBottom: 12,
        shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 4, elevation: 2,
    },
    dishImage: {
        width: 80, height: 80, borderRadius: 12, backgroundColor: COLORS.border,
    },
    cardContent: { flex: 1, marginLeft: 12, justifyContent: 'center' },
    title: { fontSize: 16, fontWeight: '700', color: COLORS.text, marginBottom: 2 },
    subtitle: { fontSize: 13, color: COLORS.textSecondary, marginBottom: 8 },

    metaRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    ratingRow: { flexDirection: 'row', alignItems: 'center' },
    star: { fontSize: 12, marginRight: 4 },
    rating: { fontSize: 14, fontWeight: '600', color: COLORS.text, marginRight: 4 },
    reviews: { fontSize: 12, color: COLORS.textSecondary },
    price: { fontSize: 16, fontWeight: '700', color: COLORS.primary },

    // Empty State
    emptyState: { alignItems: 'center', marginTop: 40 },
    emptyTitle: { fontSize: 16, fontWeight: '700', color: COLORS.text },
    emptySubtitle: { fontSize: 13, color: COLORS.textSecondary, marginTop: 4 },
    aiCard: {
        backgroundColor: '#FFF5F0',
        borderRadius: 20,
        padding: 20,
        marginTop: 10,
        borderWidth: 1,
        borderColor: '#FFE8DD',
    },
    aiHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 12,
    },
    sparkleIcon: {
        marginRight: 8,
    },
    sparkleText: {
        fontSize: 18,
        color: COLORS.primary,
    },
    aiTitle: {
        fontSize: 17,
        fontWeight: '700',
        color: COLORS.text,
    },
    aiDescription: {
        fontSize: 14,
        color: COLORS.textSecondary,
        lineHeight: 22,
        marginBottom: 18,
    },
    aiButton: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: COLORS.primary,
        paddingHorizontal: 20,
        paddingVertical: 12,
        borderRadius: 25,
        alignSelf: 'flex-start',
        gap: 8,
    },
    aiButtonPressed: {
        backgroundColor: COLORS.primaryDark,
        opacity: 0.9,
    },
    aiButtonText: {
        color: COLORS.white,
        fontSize: 15,
        fontWeight: '600',
    },
    aiButtonArrow: {
        color: COLORS.white,
        fontSize: 16,
        fontWeight: '600',
    },
});
