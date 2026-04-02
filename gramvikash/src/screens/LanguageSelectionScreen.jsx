import React, { useState, useCallback } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    FlatList,
    Dimensions,
    StatusBar,
    Platform,
    BackHandler,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { useBackHandler } from '../hooks/useBackHandler';
import { LinearGradient } from 'expo-linear-gradient';
import { useFarmerStore } from '../store';
import { translations } from '../utils/translations';

const { width } = Dimensions.get('window');
const CARD_GAP = 10;
const H_PAD = 20;
const CARD_WIDTH = (width - H_PAD * 2 - CARD_GAP) / 2;

const LANGUAGES = [
    { id: 'hi', native: 'हिन्दी', en: 'Hindi' },
    { id: 'en', native: 'English', en: 'English' },
    { id: 'mr', native: 'मराठी', en: 'Marathi' },
    { id: 'bn', native: 'বাংলা', en: 'Bengali' },
    { id: 'te', native: 'తెలుగు', en: 'Telugu' },
    { id: 'ta', native: 'தமிழ்', en: 'Tamil' },
    { id: 'gu', native: 'ગુજરાતી', en: 'Gujarati' },
    { id: 'kn', native: 'ಕನ್ನಡ', en: 'Kannada' },
    { id: 'ml', native: 'മലയാളം', en: 'Malayalam' },
    { id: 'pa', native: 'ਪੰਜਾਬੀ', en: 'Punjabi' },
    { id: 'or', native: 'ଓଡ଼ିଆ', en: 'Odia' },
    { id: 'ur', native: 'اردو', en: 'Urdu' },
    { id: 'as', native: 'অসমীয়া', en: 'Assamese' },
    { id: 'mai', native: 'मैथिली', en: 'Maithili' },
];

// ─────────────────────────────────────────────────────────
// Step progress indicator
// ─────────────────────────────────────────────────────────
function StepBar({ current = 1, total = 4 }) {
    return (
        <View style={stepStyles.wrap}>
            {Array.from({ length: total }, (_, i) => (
                <View
                    key={i}
                    style={[
                        stepStyles.dot,
                        i + 1 === current && stepStyles.dotActive,
                        i + 1 < current && stepStyles.dotDone,
                    ]}
                />
            ))}
        </View>
    );
}

const stepStyles = StyleSheet.create({
    wrap: { flexDirection: 'row', gap: 6, alignItems: 'center' },
    dot: { width: 20, height: 3, borderRadius: 2, backgroundColor: '#d6e8c0' },
    dotActive: { width: 32, backgroundColor: '#4a8c1c' },
    dotDone: { backgroundColor: '#8aad5a' },
});

// ─────────────────────────────────────────────────────────
// Language card
// ─────────────────────────────────────────────────────────
function LangCard({ item, selected, onPress }) {
    const isSelected = item.id === selected;

    return (
        <TouchableOpacity
            style={[styles.card, isSelected && styles.cardSelected]}
            onPress={onPress}
            activeOpacity={0.7}
        >
            {/* Check mark */}
            {isSelected && (
                <View style={styles.checkMark}>
                    <View style={styles.checkInner}>
                        {/* Checkmark drawn with two Views (no icon lib dependency) */}
                        <Text style={styles.checkIcon}>✓</Text>
                    </View>
                </View>
            )}

            <Text
                style={[styles.langNative, isSelected && styles.langNativeSelected]}
                numberOfLines={1}
                adjustsFontSizeToFit
                minimumFontScale={0.7}
            >
                {item.native}
            </Text>
            <Text style={[styles.langEn, isSelected && styles.langEnSelected]}>
                {item.en}
            </Text>
        </TouchableOpacity>
    );
}

// ─────────────────────────────────────────────────────────
// Main Screen
// ─────────────────────────────────────────────────────────
export default function LanguageSelectionScreen({ navigation }) {
    const [selectedId, setSelectedId] = useState('hi');
    const { updateLanguage } = useFarmerStore();

    const selectedLang = LANGUAGES.find(l => l.id === selectedId);

    // Handle hardware back press - exit app from root screen
    useBackHandler();

    const handleContinue = useCallback(() => {
        updateLanguage(selectedId);
        navigation.navigate('Login');
    }, [selectedId, navigation, updateLanguage]);

    const renderItem = useCallback(({ item }) => (
        <LangCard
            item={item}
            selected={selectedId}
            onPress={() => setSelectedId(item.id)}
        />
    ), [selectedId]);

    const keyExtractor = useCallback((item) => item.id, []);

    return (
        <SafeAreaView style={styles.root}>
            <StatusBar
                barStyle="dark-content"
                backgroundColor="transparent"
                translucent
            />

            {/* Background — flat warm off-white, no gradient noise */}
            <View style={StyleSheet.absoluteFill} backgroundColor="#faf7f1" />

            {/* ── Header ── */}
            <View style={styles.header}>
                <StepBar current={1} total={4} />

                <View style={styles.headerText}>
                    <Text style={styles.eyebrow}>{translations[selectedId]?.step1 || 'STEP 1 OF 4'}</Text>
                    <Text style={styles.headline}>{translations[selectedId]?.chooseLanguage || 'Choose your\nlanguage'}</Text>
                    <Text style={styles.sub}>
                        {translations[selectedId]?.languageSub || 'What language do you prefer to speak?'}
                    </Text>
                </View>
            </View>

            {/* Hairline divider */}
            <View style={styles.hairline} />

            {/* ── Language grid ── */}
            <FlatList
                data={LANGUAGES}
                renderItem={renderItem}
                keyExtractor={keyExtractor}
                numColumns={2}
                contentContainerStyle={styles.listContent}
                columnWrapperStyle={styles.row}
                showsVerticalScrollIndicator={false}
                bounces
                removeClippedSubviews
            />

            {/* ── Footer CTA ── */}
            <View style={styles.footer}>
                {/* gradient fade above button */}
                <LinearGradient
                    colors={['rgba(250,247,241,0)', 'rgba(250,247,241,1)']}
                    style={styles.footerFade}
                    pointerEvents="none"
                />

                <TouchableOpacity
                    style={styles.ctaBtn}
                    onPress={handleContinue}
                    activeOpacity={0.88}
                >
                    <View style={styles.ctaLeft}>
                        <Text style={styles.ctaLabel}>Continue</Text>
                        <Text style={styles.ctaSub} numberOfLines={1}>
                            {selectedLang?.native} - {selectedLang?.en}
                        </Text>
                    </View>
                    <View style={styles.ctaArrow}>
                        <Text style={styles.ctaArrowIcon}>→</Text>
                    </View>
                </TouchableOpacity>
            </View>
        </SafeAreaView>
    );
}

// ─────────────────────────────────────────────────────────
const styles = StyleSheet.create({

    root: {
        flex: 1,
        backgroundColor: '#faf7f1',
    },

    // ── Header ──────────────────────────────────────────
    header: {
        paddingTop: Platform.OS === 'android' ? 50 : 12,
        paddingHorizontal: 24,
        paddingBottom: 20,
    },
    headerText: {
        marginTop: 20,
    },
    eyebrow: {
        fontFamily: 'DMSans_500Medium',
        fontSize: 11,
        letterSpacing: 1.8,
        color: '#8aad5a',
        marginBottom: 10,
    },
    headline: {
        fontFamily: 'PlayfairDisplay_700Bold',
        fontSize: 36,
        color: '#1a2e0a',
        lineHeight: 42,
        letterSpacing: -0.5,
        marginBottom: 10,
    },
    sub: {
        fontFamily: 'NotoSansDevanagari_400Regular',
        fontSize: 14,
        color: '#6b7c5a',
        lineHeight: 20,
    },

    // ── Hairline ─────────────────────────────────────────
    hairline: {
        height: StyleSheet.hairlineWidth * 2,
        backgroundColor: '#e4edda',
        marginHorizontal: 24,
        marginBottom: 4,
    },

    // ── Grid ─────────────────────────────────────────────
    listContent: {
        paddingHorizontal: H_PAD,
        paddingTop: 12,
        paddingBottom: 120,     // clearance for footer
    },
    row: {
        gap: CARD_GAP,
        marginBottom: CARD_GAP,
    },

    // Language card — flat, no shadow, no elevation
    card: {
        width: CARD_WIDTH,
        backgroundColor: '#fff',
        borderRadius: 16,
        paddingHorizontal: 14,
        paddingVertical: 18,
        borderWidth: 1.5,
        borderColor: '#ede8dc',
        minHeight: 96,
        justifyContent: 'flex-end',
        position: 'relative',
    },
    cardSelected: {
        backgroundColor: '#f3f9ec',
        borderColor: '#5a9c28',
    },

    checkMark: {
        position: 'absolute',
        top: 10,
        right: 10,
    },
    checkInner: {
        width: 22,
        height: 22,
        borderRadius: 11,
        backgroundColor: '#5a9c28',
        alignItems: 'center',
        justifyContent: 'center',
    },
    checkIcon: {
        color: '#fff',
        fontSize: 12,
        fontWeight: '700',
        lineHeight: 14,
    },

    langNative: {
        fontFamily: 'NotoSansDevanagari_400Regular',
        fontSize: 22,
        color: '#1a2e0a',
        marginBottom: 3,
        lineHeight: 28,
    },
    langNativeSelected: {
        fontFamily: 'NotoSansDevanagari_600SemiBold',
        color: '#1a2e0a',
    },
    langEn: {
        fontFamily: 'DMSans_400Regular',
        fontSize: 12,
        color: '#9ab87a',
    },
    langEnSelected: {
        color: '#5a9c28',
    },

    // ── Footer ───────────────────────────────────────────
    footer: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        paddingBottom: Platform.OS === 'ios' ? 36 : 24,
        paddingHorizontal: 20,
    },
    footerFade: {
        position: 'absolute',
        top: -40,
        left: 0,
        right: 0,
        height: 40,
    },

    // CTA button — dark, flat, no shadow
    ctaBtn: {
        backgroundColor: '#1a2e0a',
        borderRadius: 18,
        height: 60,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingLeft: 24,
        paddingRight: 14,
        // top highlight line (no shadow)
        borderTopWidth: 1,
        borderTopColor: 'rgba(255,255,255,0.08)',
    },

    ctaLeft: {
        flexDirection: 'column',
        alignItems: 'flex-start',
    },
    ctaLabel: {
        fontFamily: 'PlayfairDisplay_600SemiBold',
        fontSize: 17,
        color: '#fff',
        letterSpacing: 0.1,
    },
    ctaSub: {
        fontFamily: 'NotoSansDevanagari_400Regular',
        fontSize: 11,
        color: 'rgba(255,255,255,0.45)',
        marginTop: 1,
    },

    ctaArrow: {
        width: 40,
        height: 40,
        borderRadius: 12,
        alignItems: 'center',
        justifyContent: 'center',
    },
    ctaArrowIcon: {
        color: '#fff',
        fontSize: 18,
        fontWeight: '300',
    },
});