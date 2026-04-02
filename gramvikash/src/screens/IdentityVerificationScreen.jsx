import React, { useState, useEffect } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    Dimensions,
    StatusBar,
    Platform,
    ActivityIndicator,
    BackHandler,
    Linking,
    Alert
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { useBackHandler } from '../hooks/useBackHandler';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFarmerStore } from '../store';
import DigiLockerWidget from '../components/DigiLockerWidget';
import { getTranslations } from '../utils/translations';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');

// ─────────────────────────────────────────────────────────
// Step progress bar
// ─────────────────────────────────────────────────────────
function StepBar({ current = 3, total = 4 }) {
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
    dot: { width: 20, height: 3, borderRadius: 2, backgroundColor: 'rgba(255,255,255,0.12)' },
    dotActive: { width: 32, backgroundColor: '#7ab648' },
    dotDone: { backgroundColor: 'rgba(255,255,255,0.45)' },
});

export default function IdentityVerificationScreen({ navigation }) {
    const { language, farmer } = useFarmerStore();
    const t = getTranslations(language);

    useEffect(() => {
        const handleDeepLink = (event) => {
            const { url } = event;
            if (url && url.includes('digilocker/success')) {
                Alert.alert("DigiLocker", "Authorized Successfully!");
            }
        };

        const subscription = Linking.addEventListener('url', handleDeepLink);
        return () => subscription.remove();
    }, []);

    // Handle hardware back press - go back to OTP verification
    useBackHandler(() => {
        navigation.navigate('OTPVerification');
        return true;
    });

    const [loading, setLoading] = useState(false);

    const handleDigiLockerSuccess = (ekycData) => {
        navigation.replace('ProfileSetup', {
            prefill: {
                name: ekycData.name,
                village: ekycData.village,
                district: ekycData.district,
                state: ekycData.state
            }
        });
    };

    const handleSkip = () => {
        navigation.replace('ProfileSetup', { prefill: null });
    };

    return (
        <View style={styles.root}>
            <StatusBar barStyle="light-content" backgroundColor="transparent" translucent />

            {/* ── HERO ── */}
            <View style={styles.hero}>
                <View style={[styles.arc, styles.arc1]} />
                <View style={[styles.arc, styles.arc2]} />

                <SafeAreaView style={styles.safeHero}>
                    <StepBar current={3} total={4} />
                </SafeAreaView>

                <View style={{ flex: 1 }} />

                <View style={styles.heroBadge}>
                    <Text style={styles.heroBadgeEmoji}>🌾</Text>
                </View>

                <Text style={styles.heroEyebrow}>{t.step3 || 'STEP 3 OF 4'}</Text>
                <Text style={styles.heroTitle}>{t.verifyIdentityTitle || "Verify Identity\nSecurely"}</Text>
                <Text style={styles.heroSub}>{t.digilockerInstruction || "Connect with DigiLocker to auto-fill your details."}</Text>
            </View>

            {/* Curved connector */}
            <View style={styles.connector}>
                <View style={styles.connectorCurve} />
            </View>

            {/* ── BODY ── */}
            <View style={styles.body}>

                {!loading ? (
                    <DigiLockerWidget
                        farmerId={farmer?.id}
                        onSuccess={handleDigiLockerSuccess}
                    />
                ) : (
                    <View style={styles.loadingBox}>
                        <ActivityIndicator size="large" color="#5a9c28" />
                        <Text style={styles.loadingText}>
                            {t.connectingDigilocker || "Securely connecting to DigiLocker..."}
                        </Text>
                    </View>
                )}

                <View style={styles.infoBox}>
                    <Text style={styles.infoText}>{t.digilockerPrivacyNote || "Government of India platform. We never store your Aadhaar number."}</Text>
                </View>

                <View style={{ flex: 1 }} />

                {/* ── SKIP CTA ── */}
                <TouchableOpacity
                    style={styles.skipBtn}
                    onPress={handleSkip}
                    activeOpacity={0.6}
                >
                    <Text style={styles.skipLabel}>{t.skipManually || "Skip for now, I'll enter manually"}</Text>
                </TouchableOpacity>

                <View style={{ height: Platform.OS === 'ios' ? 40 : 20 }} />
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    root: { flex: 1, backgroundColor: '#1a2e0a' },

    // Hero Section
    hero: {
        height: SCREEN_HEIGHT * 0.42,
        backgroundColor: '#1a2e0a',
        paddingHorizontal: 28,
        paddingBottom: 20,
        position: 'relative',
        overflow: 'hidden',
    },
    safeHero: {
        paddingTop: Platform.OS === 'android' ? 36 : 20,
        flexDirection: 'row',
        alignItems: 'center',
    },
    backBtn: { marginRight: 20 },
    backIconBox: {
        width: 36, height: 36,
        borderRadius: 12,
        backgroundColor: 'rgba(255,255,255,0.08)',
        alignItems: 'center',
        justifyContent: 'center',
    },
    backBtnText: { color: '#fff', fontSize: 18, fontWeight: '300' },

    arc: {
        position: 'absolute',
        borderRadius: 999,
        borderWidth: 1.5,
        borderColor: 'rgba(122,182,72,0.07)',
    },
    arc1: { width: 300, height: 300, top: -50, right: -100 },
    arc2: { width: 150, height: 150, bottom: -20, left: -40 },

    heroBadge: {
        width: 50, height: 50,
        borderRadius: 15,
        backgroundColor: 'rgba(122,182,72,0.15)',
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 16,
    },
    heroBadgeEmoji: { fontSize: 24 },
    heroEyebrow: {
        fontFamily: 'DMSans_500Medium',
        fontSize: 10,
        letterSpacing: 1.5,
        color: '#7ab648',
        textTransform: 'uppercase',
        marginBottom: 8,
    },
    heroTitle: {
        fontFamily: 'PlayfairDisplay_700Bold',
        fontSize: 32,
        color: '#fff',
        lineHeight: 38,
        marginBottom: 6,
    },
    heroSub: {
        fontFamily: 'DMSans_400Regular',
        fontSize: 13,
        color: 'rgba(255,255,255,0.4)',
        lineHeight: 18,
    },

    // Connector
    connector: { height: 32, backgroundColor: '#1a2e0a' },
    connectorCurve: {
        flex: 1,
        backgroundColor: '#faf7f1',
        borderTopLeftRadius: 32,
        borderTopRightRadius: 32,
    },

    // Body Section
    body: {
        flex: 1,
        backgroundColor: '#faf7f1',
        paddingHorizontal: 24,
    },
    loadingBox: {
        alignItems: 'center',
        padding: 40,
    },
    loadingText: {
        marginTop: 16,
        fontFamily: 'DMSans_500Medium',
        color: '#6b7c5a',
        fontSize: 14,
    },
    infoBox: {
        flexDirection: 'row',
        backgroundColor: '#f6fbf0',
        padding: 16,
        borderRadius: 16,
        borderWidth: 1,
        borderColor: '#ede8dc',
        alignItems: 'center',
    },
    infoIcon: { fontSize: 16, marginRight: 12 },
    infoText: {
        flex: 1,
        fontFamily: 'DMSans_400Regular',
        fontSize: 12,
        color: '#6b7c5a',
        lineHeight: 16,
    },
    skipBtn: {
        paddingVertical: 16,
        alignItems: 'center',
    },
    skipLabel: {
        fontFamily: 'DMSans_600SemiBold',
        fontSize: 14,
        color: '#6b7c5a',
        textDecorationLine: 'underline',
    },
});
