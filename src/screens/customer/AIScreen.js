import React, { useState } from 'react';
import {
    View,
    TextInput,
    Image,
    Pressable,
    ScrollView,
    StyleSheet,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import AppButton from '../../components/AppButton';
import AppText from '../../components/AppText';
import AppCard from '../../components/AppCard';
import MicIcon from '../../assets/icons/mic.png';
import { COLORS } from '../../theme/colors';
import { SPACING, RADIUS } from '../../theme/spacing';

const MAX_CHARS = 200;

const CRAVINGS = [
    { emoji: "🍝", text: "Creamy chicken pasta under Rs. 1,200" },
    { emoji: "🔥", text: "Spicy midnight comfort food" },
    { emoji: "🥗", text: "Healthy high-protein bowl" },
    { emoji: "🍲", text: "Authentic Biryani nearby" },
];

const PREFERENCES = [
    { id: "budget", emoji: "💰", label: "Under Rs. 1,000" },
    { id: "rating", emoji: "⭐", label: "Rating 4.5+" },
    { id: "fast", emoji: "⚡", label: "Under 30 mins" },
];

export default function FoodMindAIScreen({ onBack, onSubmit }) {
    const [query, setQuery] = useState("");
    const [selectedPrefs, setSelectedPrefs] = useState([]);

    const canSubmit = query.trim().length > 0;

    const togglePref = (id) =>
        setSelectedPrefs((prev) =>
            prev.includes(id) ? prev.filter((p) => p !== id) : [...prev, id]
        );

    const handleClear = () => {
        setQuery("");
        setSelectedPrefs([]);
    };

    const handleSubmit = () =>
        onSubmit?.({ query: query.trim(), preferences: selectedPrefs });

    return (
        <SafeAreaView style={styles.safe} edges={['top']}>
            <ScrollView
                style={styles.flex}
                contentContainerStyle={styles.scrollContent}
                keyboardShouldPersistTaps="handled"
                showsVerticalScrollIndicator={false}
            >
                {/* Header */}
                <View style={styles.header}>
                    <Pressable
                        onPress={onBack}
                        hitSlop={8}
                        accessibilityRole="button"
                        accessibilityLabel="Go back"
                        style={({ pressed }) => [
                            styles.backButton,
                            pressed && styles.pressed,
                        ]}
                    >
                        <AppText style={styles.backText}>‹</AppText>
                    </Pressable>

                    <AppText style={styles.headerTitle} numberOfLines={1}>
                        FoodMind AI <AppText style={styles.sparkle}>✦</AppText>
                    </AppText>

                    <Pressable
                        onPress={handleClear}
                        style={({ pressed }) => [
                            styles.clearButton,
                            pressed && styles.pressed,
                        ]}
                    >
                        <AppText style={styles.clearText}>Clear</AppText>
                    </Pressable>
                </View>

                {/* Intro card */}
                <AppCard style={styles.introCard}>
                    <View style={styles.aiBadge}>
                        <AppText color={COLORS.white} style={styles.aiBadgeText}>AI</AppText>
                    </View>
                    <View style={styles.introBody}>
                        <AppText style={styles.introTitle}>
                            Tell me what you're craving
                        </AppText>
                        <AppText style={styles.introSubtitle}>
                            Use natural language. Mention food type, budget,
                            dietary needs, or even your mood.
                        </AppText>
                    </View>
                </AppCard>

                {/* Popular cravings */}
                <View style={styles.sectionHeader}>
                    <AppText style={styles.sectionLabel}>POPULAR CRAVINGS</AppText>
                    <AppText style={styles.sectionHint}>Tap to insert</AppText>
                </View>

                <View style={styles.cravingList}>
                    {CRAVINGS.map((item) => (
                        <Pressable
                            key={item.text}
                            onPress={() => setQuery(item.text)}
                            style={({ pressed }) => [
                                styles.chip,
                                pressed && styles.pressed,
                            ]}
                        >
                            <AppText style={styles.chipText}>
                                {item.emoji}  "{item.text}"
                            </AppText>
                        </Pressable>
                    ))}
                </View>

                {/* Request input */}
                <AppText style={[styles.sectionLabel, styles.requestLabel]}>
                    YOUR REQUEST
                </AppText>

                <AppCard style={styles.inputCard}>
                    <TextInput
                        value={query}
                        onChangeText={setQuery}
                        maxLength={MAX_CHARS}
                        multiline
                        textAlignVertical="top"
                        placeholder="E.g., Find me a rich chicken pasta under Rs. 1,200, highly rated, delivered within 30 mins..."
                        placeholderTextColor={COLORS.textSecondary}
                        style={styles.input}
                    />
                    <View style={styles.divider} />
                    <View style={styles.inputFooter}>
                        <AppText style={styles.counter}>
                            {query.length} / {MAX_CHARS} characters
                        </AppText>
                        <Pressable
                            accessibilityLabel="Voice input"
                            style={({ pressed }) => [
                                styles.micButton,
                                pressed && styles.pressed,
                            ]}
                        >
                            <Image source={MicIcon} style={styles.micIcon} />
                        </Pressable>
                    </View>
                </AppCard>

                {/* Quick preferences */}
                <AppText style={[styles.sectionLabel, styles.prefLabel]}>
                    QUICK PREFERENCES
                </AppText>

                {/* Negative margin lets the chips scroll edge-to-edge */}
                <ScrollView
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    style={styles.prefScroll}
                    contentContainerStyle={styles.prefRow}
                    keyboardShouldPersistTaps="handled"
                >
                    {PREFERENCES.map((pref) => {
                        const active = selectedPrefs.includes(pref.id);
                        return (
                            <Pressable
                                key={pref.id}
                                onPress={() => togglePref(pref.id)}
                                style={({ pressed }) => [
                                    styles.prefChip,
                                    active && styles.prefChipActive,
                                    pressed && styles.pressed,
                                ]}
                            >
                                <AppText
                                    style={[
                                        styles.chipText,
                                        active && styles.prefChipTextActive,
                                    ]}
                                >
                                    {pref.emoji}  {pref.label}
                                </AppText>
                            </Pressable>
                        );
                    })}
                </ScrollView>
            </ScrollView>

            {/* CTA */}
            <View style={styles.footer}>
                <AppButton
                    title="Find My Food  →"
                    onPress={handleSubmit}
                    disabled={!canSubmit}
                    style={styles.cta}
                    testID="find-food-button"
                />
            </View>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    safe: { flex: 1, backgroundColor: COLORS.background },
    flex: { flex: 1 },
    scrollContent: { paddingHorizontal: SPACING.xl, paddingBottom: SPACING.sm },
    pressed: { opacity: 0.7 },

    // Header
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingTop: SPACING.md,
        paddingBottom: SPACING.lg,
    },
    backButton: {
        width: 44,
        height: 44,
        borderRadius: RADIUS.pill,
        backgroundColor: COLORS.white,
        borderWidth: 1,
        borderColor: COLORS.border,
        alignItems: 'center',
        justifyContent: 'center',
        shadowColor: '#000',
        shadowOpacity: 0.05,
        shadowRadius: 8,
        shadowOffset: { width: 0, height: 2 },
        elevation: 2,
    },
    backText: {
        fontSize: 30,
        lineHeight: 32,
        color: COLORS.text,
        marginTop: -4,
        marginLeft: -2,
        includeFontPadding: false,
    },
    headerTitle: {
        flex: 1,
        marginLeft: 14,
        fontSize: 24,
        fontWeight: '800',
        letterSpacing: -0.4,
        color: COLORS.text,
    },
    sparkle: { fontSize: 14, color: COLORS.primary },
    clearButton: {
        paddingHorizontal: 18,
        paddingVertical: 9,
        borderRadius: 20,
        backgroundColor: COLORS.inputBackground,
    },
    clearText: { fontSize: 14, fontWeight: '600', color: COLORS.textSecondary },

    // Intro card
    introCard: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: SPACING.xl,
        borderRadius: 28,
        backgroundColor: COLORS.primaryLight,
        borderColor: COLORS.border,
        marginBottom: SPACING.xxl,
    },
    aiBadge: {
        width: 52,
        height: 52,
        borderRadius: 16,
        backgroundColor: COLORS.primary,
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: SPACING.lg,
        shadowColor: COLORS.primary,
        shadowOpacity: 0.35,
        shadowRadius: 10,
        shadowOffset: { width: 0, height: 4 },
        elevation: 4,
    },
    aiBadgeText: { fontSize: 18, fontWeight: '800' },
    introBody: { flex: 1 },
    introTitle: {
        fontSize: 18,
        fontWeight: '800',
        letterSpacing: -0.3,
        color: COLORS.text,
        marginBottom: 6,
    },
    introSubtitle: { fontSize: 14, lineHeight: 21, color: COLORS.textSecondary },

    // Section headings
    sectionHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: 14,
    },
    sectionLabel: {
        fontSize: 13,
        fontWeight: '700',
        letterSpacing: 1.2,
        color: COLORS.textSecondary,
    },
    sectionHint: { fontSize: 13, color: COLORS.textSecondary },

    // Chips
    cravingList: { alignItems: 'flex-start', marginBottom: SPACING.xxl },
    chip: {
        paddingHorizontal: SPACING.lg,
        paddingVertical: 11,
        borderRadius: 22,
        backgroundColor: COLORS.white,
        borderWidth: 1,
        borderColor: COLORS.border,
        marginBottom: 10,
    },
    chipText: { fontSize: 14, color: COLORS.text },

    // Input
    requestLabel: { marginBottom: 14 },
    inputCard: {
        padding: 0,
        borderRadius: 24,
        marginBottom: SPACING.xxl,
        overflow: 'hidden',
    },
    input: {
        minHeight: 110,
        fontSize: 16,
        lineHeight: 24,
        color: COLORS.text,
        paddingHorizontal: 18,
        paddingTop: 16,
        paddingBottom: 12,
    },
    divider: {
        height: StyleSheet.hairlineWidth,
        backgroundColor: COLORS.border,
    },
    inputFooter: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 18,
        paddingVertical: 10,
    },
    counter: { fontSize: 13, color: COLORS.textSecondary },
    micButton: {
        width: 40,
        height: 40,
        borderRadius: RADIUS.pill,
        backgroundColor: COLORS.inputBackground,
        alignItems: 'center',
        justifyContent: 'center',
    },
    micIcon: { width: 20, height: 20 },

    // Quick preferences
    prefLabel: { marginBottom: 14 },
    prefScroll: { marginHorizontal: -SPACING.xl },
    prefRow: { paddingHorizontal: SPACING.xl },
    prefChip: {
        paddingHorizontal: SPACING.lg,
        paddingVertical: 11,
        borderRadius: 22,
        backgroundColor: COLORS.white,
        borderWidth: 1,
        borderColor: COLORS.border,
        marginRight: 10,
    },
    prefChipActive: { backgroundColor: COLORS.primaryLight, borderColor: COLORS.primary },
    prefChipTextActive: { color: COLORS.primary, fontWeight: '600' },

    // CTA
    footer: { paddingHorizontal: SPACING.xl, paddingTop: SPACING.xl, paddingBottom: SPACING.lg },
    cta: {
        height: 56,
        borderRadius: 20,
        shadowColor: COLORS.primary,
        shadowOpacity: 0.3,
        shadowRadius: 14,
        shadowOffset: { width: 0, height: 6 },
        elevation: 6,
    },
});
