import React, { useState } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    ScrollView,
    StatusBar,
    Dimensions,
    Image,
    Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { useBackHandler } from '../hooks/useBackHandler';
import { auth, signOut } from '../utils/firebase';
import { useFarmerStore } from '../store';
import { translations } from '../utils/translations';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const LANG_CARD_GAP = 10;
const LANG_CARD_WIDTH = (SCREEN_WIDTH - 28 * 2 - LANG_CARD_GAP) / 2;

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

// DigiLocker Asset Path
const DIGILOCKER_ASSET = require('../../assets/DigiLocker.svg');

export default function ProfileScreen() {
    const navigation = useNavigation();
    const { updateLanguage, language: storedLang } = useFarmerStore();
    const [selectedLangId, setSelectedLangId] = useState(storedLang || 'hi');

    const selectedLang = LANGUAGES.find(l => l.id === selectedLangId) || LANGUAGES[0];

    const handleSelectLanguage = (langId) => {
        setSelectedLangId(langId);
        updateLanguage(langId);
    };

    useBackHandler(() => {
        navigation.navigate('MainTabs');
        return true;
    });

    const t = translations[selectedLangId] || translations['hi'];


    const handleLogout = () => {
        Alert.alert(
            t.logoutConfirmTitle,
            t.logoutConfirmMsg,
            [
                { text: t.cancel, style: 'cancel' },
                {
                    text: t.logout,
                    style: 'destructive',
                    onPress: async () => {
                        try {
                            await signOut();
                        } catch (e) {
                            console.warn('Logout error:', e);
                        } finally {
                            navigation.reset({
                                index: 0,
                                routes: [{ name: 'Login' }],
                            });
                        }
                    },
                },
            ],
            { cancelable: true }
        );
    };

    return (
        <SafeAreaView style={styles.safe}>
            <StatusBar barStyle="dark-content" backgroundColor="#faf7f1" />

            <ScrollView
                showsVerticalScrollIndicator={false}
                contentContainerStyle={styles.scrollContent}
            >
                {/* Standard Header Row (Matches Emergency/Crops) */}
                <View style={styles.headerRow}>
                    <TouchableOpacity
                        style={styles.backBtn}
                        onPress={() => navigation.navigate('MainTabs')}
                    >
                        <Ionicons name="arrow-back" size={24} color="#1a2e0a" />
                    </TouchableOpacity>
                    <Text style={styles.screenTitle}>{t.profileTitle}</Text>
                    <TouchableOpacity style={styles.infoBtn}>
                        <Ionicons name="settings-outline" size={24} color="#6b7280" />
                    </TouchableOpacity>
                </View>

                {/* Profile Hero section (Light Theme) */}
                <View style={styles.heroSection}>
                    <View style={styles.avatarContainer}>
                        <View style={styles.avatarCircle}>
                            <Text style={styles.avatarEmoji}>👨‍🌾</Text>
                        </View>
                    </View>
                    <Text style={styles.profileName}>रमेश पाटिल</Text>
                    <View style={styles.langBadge}>
                        <Text style={styles.langEmoji}>🇮🇳</Text>
                        <Text style={styles.langText}>{selectedLang.native} · {selectedLang.en}</Text>
                    </View>
                </View>

                {/* Farming Information Section */}
                <View style={styles.sectionHeader}>
                    <Text style={styles.sectionTitle}>{t.farmingInfo}</Text>
                    <TouchableOpacity>
                        <Text style={styles.editBtnText}>{t.edit}</Text>
                    </TouchableOpacity>
                </View>

                <View style={styles.infoCard}>
                    <View style={styles.infoRow}>
                        <Text style={styles.infoLabel}>{t.crop}</Text>
                        <Text style={styles.infoValue}>{t.sampleCrops}</Text>
                    </View>
                    <View style={styles.divider} />
                    <View style={styles.infoRow}>
                        <Text style={styles.infoLabel}>{t.land}</Text>
                        <Text style={styles.infoValue}>{t.sampleLand}</Text>
                    </View>
                    <View style={styles.divider} />
                    <View style={styles.infoRow}>
                        <Text style={styles.infoLabel}>{t.districtLabel}</Text>
                        <Text style={styles.infoValue}>{t.sampleDistrict}</Text>
                    </View>
                    <View style={styles.divider} />
                    <View style={styles.infoRow}>
                        <Text style={styles.infoLabel}>{t.mobileLabel}</Text>
                        <Text style={styles.infoValue}>98765 43210</Text>
                    </View>
                </View>

                {/* Language Settings Section */}
                <View style={styles.sectionHeader}>
                    <Text style={styles.sectionTitle}>{t.languageSettings}</Text>
                </View>

                <View style={styles.langGrid}>
                    {LANGUAGES.map((lang, idx) => {
                        const isSelected = lang.id === selectedLangId;
                        const isOdd = LANGUAGES.length % 2 !== 0;
                        const isLast = idx === LANGUAGES.length - 1;
                        return (
                            <TouchableOpacity
                                key={lang.id}
                                style={[
                                    styles.langCard,
                                    isSelected && styles.langCardSelected,
                                    isOdd && isLast && styles.langCardFull,
                                ]}
                                onPress={() => handleSelectLanguage(lang.id)}
                                activeOpacity={0.75}
                            >
                                {isSelected && (
                                    <View style={styles.langCheck}>
                                        <Text style={styles.langCheckIcon}>✓</Text>
                                    </View>
                                )}
                                <Text
                                    style={[styles.langCardNative, isSelected && styles.langCardNativeSelected]}
                                    numberOfLines={1}
                                    adjustsFontSizeToFit
                                    minimumFontScale={0.7}
                                >
                                    {lang.native}
                                </Text>
                                <Text style={[styles.langCardEn, isSelected && styles.langCardEnSelected]}>
                                    {lang.en}
                                </Text>
                            </TouchableOpacity>
                        );
                    })}
                </View>

                {/* DigiLocker Section with Image Asset */}
                <View style={styles.digiSectionHeader}>
                    <Text style={styles.digiSectionLabel}>DIGILOCKER VERIFIED</Text>
                </View>

                <View style={styles.digiCard}>
                    <View style={styles.digiHeader}>
                        <View style={styles.assetWrapper}>
                            <Image
                                source={DIGILOCKER_ASSET}
                                style={styles.digiLogo}
                                resizeMode="contain"
                            />
                        </View>
                        <View style={styles.verifiedBadge}>
                            <Ionicons name="checkmark-circle" size={16} color="#16a34a" />
                            <Text style={styles.verifiedText}>{t.verified}</Text>
                        </View>
                    </View>

                    <View style={styles.digiDetails}>
                        <View style={styles.digiRow}>
                            <Text style={styles.digiLabel}>{t.fullNamePlaceholder}</Text>
                            <Text style={styles.digiValue}>रमेश पाटिल</Text>
                        </View>
                        <View style={styles.digiRow}>
                            <Text style={styles.digiLabel}>Aadhaar</Text>
                            <Text style={styles.digiValue}>XXXX XXXX 1234</Text>
                        </View>
                        <View style={styles.digiRow}>
                            <Text style={styles.digiLabel}>{t.kycStatus}</Text>
                            <View style={styles.kycValueRow}>
                                <Text style={styles.digiValue}>{t.kycDone}</Text>
                                <Ionicons name="checkmark" size={14} color="#1a2e0a" />
                            </View>
                        </View>
                    </View>
                </View>

                <View style={styles.footerSpacing} />

                {/* Logout Button */}
                <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout} activeOpacity={0.8}>
                    <Ionicons name="log-out-outline" size={20} color="#ef4444" />
                    <Text style={styles.logoutText}>{t.logout}</Text>
                </TouchableOpacity>

                <View style={{ height: 40 }} />
            </ScrollView>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    safe: {
        flex: 1,
        backgroundColor: '#faf7f1',
    },
    scrollContent: {
        paddingHorizontal: 14,
        paddingTop: 40,
        paddingBottom: 10,
    },
    headerRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: 30,
    },
    backBtn: {
        padding: 4,
        marginLeft: -4,
    },
    screenTitle: {
        fontSize: 22,
        fontFamily: 'PlayfairDisplay_700Bold',
        color: '#1a2e0a',
    },
    infoBtn: {
        padding: 4,
    },
    heroSection: {
        alignItems: 'center',
        marginBottom: 32,
    },
    avatarContainer: {
        marginBottom: 16,
    },
    avatarCircle: {
        width: 110,
        height: 110,
        borderRadius: 55,
        backgroundColor: '#ffffff',
        borderWidth: 1.5,
        borderColor: '#e2e8f0',
        alignItems: 'center',
        justifyContent: 'center',
        elevation: 2,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 10,
    },
    avatarEmoji: {
        fontSize: 52,
    },
    profileName: {
        fontSize: 32,
        fontFamily: 'NotoSansDevanagari_700Bold',
        color: '#1a2e0a',
    },
    langBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#ebf0e6',
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 12,
        marginTop: 10,
        gap: 8,
        borderWidth: 1,
        borderColor: '#d9e2d1',
    },
    langEmoji: {
        fontSize: 14,
    },
    langText: {
        fontSize: 14,
        color: '#4a7543',
        fontFamily: 'DMSans_500Medium',
    },
    sectionHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 16,
    },
    sectionTitle: {
        fontSize: 17,
        fontFamily: 'NotoSansDevanagari_600SemiBold',
        color: '#1a2e0a',
    },
    editBtnText: {
        fontSize: 13,
        color: '#64748b',
        fontFamily: 'NotoSansDevanagari_500Medium',
    },
    infoCard: {
        backgroundColor: '#ffffff',
        borderRadius: 24,
        paddingVertical: 8,
        paddingHorizontal: 20,
        borderWidth: 1.3,
        borderColor: '#e2e8f0',
        marginBottom: 32,
    },
    infoRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        paddingVertical: 18,
        alignItems: 'center',
    },
    infoLabel: {
        fontSize: 15,
        fontFamily: 'NotoSansDevanagari_400Regular',
        color: '#64748b',
    },
    infoValue: {
        fontSize: 17,
        fontFamily: 'NotoSansDevanagari_700Bold',
        color: '#1a2e0a',
    },
    divider: {
        height: 1,
        backgroundColor: '#f1f5f9',
    },
    digiSectionHeader: {
        marginBottom: 16,
    },
    digiSectionLabel: {
        fontSize: 13,
        letterSpacing: 1.5,
        color: '#6b7280',
        fontFamily: 'DMSans_700Bold',
    },
    digiCard: {
        backgroundColor: '#ffffff',
        borderRadius: 24,
        padding: 24,
        borderWidth: 1.3,
        borderColor: '#e2e8f0',
    },
    digiHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: 24,
    },
    assetWrapper: {
        height: 35,
        width: 140,
        justifyContent: 'center',
    },
    digiLogo: {
        width: '100%',
        height: '100%',
    },
    verifiedBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#f0fdf4',
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: 8,
        gap: 6,
        borderWidth: 1,
        borderColor: '#dcfce7',
    },
    verifiedText: {
        fontSize: 12,
        fontFamily: 'NotoSansDevanagari_700Bold',
        color: '#16a34a',
    },
    digiDetails: {
        gap: 14,
    },
    digiRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    digiLabel: {
        fontSize: 13,
        fontFamily: 'NotoSansDevanagari_400Regular',
        color: '#64748b',
    },
    digiValue: {
        fontSize: 15,
        fontFamily: 'NotoSansDevanagari_600SemiBold',
        color: '#1a2e0a',
    },
    kycValueRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
    },
    footerSpacing: {
        height: 40,
    },
    logoutBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 10,
        backgroundColor: '#fff1f2',
        borderRadius: 20,
        paddingVertical: 16,
        borderWidth: 1.3,
        borderColor: '#fecdd3',
    },
    logoutText: {
        fontSize: 16,
        fontFamily: 'NotoSansDevanagari_600SemiBold',
        color: '#ef4444',
    },
    langGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: LANG_CARD_GAP,
        marginBottom: 32,
    },
    langCard: {
        width: LANG_CARD_WIDTH,
        backgroundColor: '#ffffff',
        borderRadius: 16,
        paddingHorizontal: 12,
        paddingVertical: 14,
        borderWidth: 1.5,
        borderColor: '#ede8dc',
        minHeight: 80,
        justifyContent: 'flex-end',
        position: 'relative',
    },
    langCardSelected: {
        backgroundColor: '#f3f9ec',
        borderColor: '#5a9c28',
    },
    langCardFull: {
        width: '100%',
    },
    langCheck: {
        position: 'absolute',
        top: 8,
        right: 8,
        width: 18,
        height: 18,
        borderRadius: 9,
        backgroundColor: '#5a9c28',
        alignItems: 'center',
        justifyContent: 'center',
    },
    langCheckIcon: {
        color: '#fff',
        fontSize: 10,
        fontWeight: '700',
    },
    langCardNative: {
        fontFamily: 'NotoSansDevanagari_400Regular',
        fontSize: 18,
        color: '#1a2e0a',
        marginBottom: 2,
    },
    langCardNativeSelected: {
        fontFamily: 'NotoSansDevanagari_600SemiBold',
    },
    langCardEn: {
        fontFamily: 'DMSans_400Regular',
        fontSize: 11,
        color: '#9ab87a',
    },
    langCardEnSelected: {
        color: '#5a9c28',
    },
});

