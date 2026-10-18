import { View, Text, Pressable, StyleSheet } from "react-native";
import { COLORS } from "../theme/colors";

const SLOT = 40; // back button / side slot size (keeps the title truly centered)

export default function Header({ title, onBack, centerTitle = false, right }) {
    return (
        <View style={header.container}>
            {/* Left slot: always rendered so the title stays centered */}
            <View style={header.slot}>
                {onBack ? (
                    <Pressable
                        onPress={onBack}
                        style={({ pressed }) => [
                            header.backButton,
                            pressed && header.backButtonPressed,
                        ]}
                    >
                        <Text style={header.backText}>‹</Text>
                    </Pressable>
                ) : null}
            </View>

            <Text
                style={[header.title, centerTitle && header.titleCenter]}
            >
                {title}
            </Text>

            {/* Right slot: mirrors the left so layout never shifts */}
            <View style={[header.slot, header.slotRight]}>{right ?? null}</View>
        </View>
    );
}

const header = StyleSheet.create({
    container: {
        flexDirection: "row",
        alignItems: "center",
        paddingHorizontal: 20,
        paddingTop: 8,
        paddingBottom: 12,
        // Transparent so the screen's cream background shows through
        backgroundColor: "transparent",
    },
    slot: {
        width: SLOT,
        height: SLOT,
        justifyContent: "center",
        alignItems: "flex-start",
    },
    slotRight: {
        alignItems: "flex-end",
    },
    backButton: {
        width: SLOT,
        height: SLOT,
        borderRadius: SLOT / 2,
        backgroundColor: COLORS.white,
        alignItems: "center",
        justifyContent: "center",
        // Soft, subtle lift
        shadowColor: "#000",
        shadowOpacity: 0.06,
        shadowRadius: 8,
        shadowOffset: { width: 0, height: 2 },
        elevation: 2,
    },
    backButtonPressed: {
        opacity: 0.7,
        transform: [{ scale: 0.95 }],
    },
    backText: {
        fontSize: 28,
        lineHeight: 30,
        fontWeight: "400",
        color: COLORS.text,
        // Optical centering: the "‹" glyph sits low and slightly right
        marginTop: -3,
        marginLeft: -1,
        includeFontPadding: false,
    },
    title: {
        flex: 1,
        fontSize: 20,
        fontWeight: "700",
        letterSpacing: -0.2,
        color: COLORS.text,
        marginHorizontal: 12,
    },
    titleCenter: {
        textAlign: "center",
    },
});