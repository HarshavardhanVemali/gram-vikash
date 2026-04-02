import React, { useState, useRef, useCallback } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    TouchableWithoutFeedback,
    TextInput,
    Dimensions,
    StatusBar,
    Platform,
    Animated,
    ActivityIndicator,
    Alert,
    Keyboard,
    KeyboardAvoidingView,
    ScrollView,
    BackHandler
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { useBackHandler } from '../hooks/useBackHandler';
import { SafeAreaView } from 'react-native-safe-area-context';
import { auth, isNativeAuth, signInWithPhoneNumber } from '../utils/firebase';
import { useFarmerStore, useAuthStore } from '../store';
import { getTranslations } from '../utils/translations';

const { width, height: SCREEN_HEIGHT } = Dimensions.get('window');

// ─────────────────────────────────────────────────────────
// Step progress bar — same across all onboarding screens
// ─────────────────────────────────────────────────────────
function StepBar({ current = 2, total = 4 }) {
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

// ─────────────────────────────────────────────────────────
// Trust chip pill
// ─────────────────────────────────────────────────────────
function TrustChip({ emoji, label }) {
    return (
        <View style={chipStyles.wrap}>
            <Text style={chipStyles.emoji}>{emoji}</Text>
            <Text style={chipStyles.label}>{label}</Text>
        </View>
    );
}
const chipStyles = StyleSheet.create({
    wrap: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 5,
        backgroundColor: '#f3f9ec',
        borderWidth: 1,
        borderColor: '#d6e8c0',
        borderRadius: 20,
        paddingHorizontal: 12,
        paddingVertical: 6,
    },
    emoji: { fontSize: 12 },
    label: {
        fontFamily: 'DMSans_500Medium',
        fontSize: 11,
        color: '#4a8c1c',
    },
});

// ─────────────────────────────────────────────────────────
// Main Screen
// ─────────────────────────────────────────────────────────
export default function LoginScreen({ navigation }) {
    const { language } = useFarmerStore();
    const setConfirmationResult = useAuthStore(state => state.setConfirmationResult);
    const setPhoneNumber = useAuthStore(state => state.setPhoneNumber);
    const t = getTranslations(language);

    // Handle hardware back press - go back to language selection
    useBackHandler(() => {
        navigation.navigate('LanguageSelect');
        return true;
    });

    const [phone, setPhone] = useState('');
    const [focused, setFocused] = useState(false);
    const [loading, setLoading] = useState(false);

    const inputRef = useRef(null);
    const borderAnim = useRef(new Animated.Value(0)).current;

    // ── Format for display: "98765 43210"
    const formattedPhone = phone.length > 5
        ? `${phone.slice(0, 5)} ${phone.slice(5)}`
        : phone;

    const canContinue = phone.length === 10 && !loading;

    // ── Input focus border animation
    const onFocus = useCallback(() => {
        setFocused(true);
        Animated.timing(borderAnim, {
            toValue: 1, duration: 180, useNativeDriver: false,
        }).start();
    }, []);

    const onBlur = useCallback(() => {
        setFocused(false);
        Animated.timing(borderAnim, {
            toValue: 0, duration: 180, useNativeDriver: false,
        }).start();
    }, []);

    const borderColor = borderAnim.interpolate({
        inputRange: [0, 1],
        outputRange: ['#e0edcc', '#5a9c28'],
    });

    // ── Send OTP via Firebase
    const handleSendOTP = useCallback(async () => {
        if (!canContinue) return;
        Keyboard.dismiss();
        setLoading(true);

        try {
            const phoneNumber = `+91${phone}`;
            console.log('Firebase: Sending OTP to', phoneNumber, 'isNative?', isNativeAuth);

            if (isNativeAuth) {
                // Native Mobile SDK flow (Silent verification in dev builds)
                // The utility already encapsulates the auth instance
                const confirmation = await signInWithPhoneNumber(phoneNumber);
                setConfirmationResult(confirmation);
                setPhoneNumber(phoneNumber);
                navigation.navigate('OTPVerification', { phoneNumber });
            } else {
                // Expo Go / Web Fallback
                Alert.alert(
                    'Development Build Required',
                    'Phone authentication requires a Native Development Build. Please run "npx expo run:android" to test this feature.'
                );
            }
        } catch (error) {
            console.error('Firebase: Auth Error:', error);
            if (error.code === 'auth/invalid-phone-number') {
                Alert.alert('Invalid Number', 'Please check your mobile number.');
            } else if (error.code === 'auth/too-many-requests') {
                Alert.alert('Blocked', 'Too many requests. Please use a whitelisted Test Phone Number in the Firebase Console to continue testing.');
            } else if (error.code === 'auth/missing-client-identifier') {
                Alert.alert(
                    'Verification Error',
                    'This device cannot be verified. This usually means the Play Integrity API is not enabled in Google Cloud Console, or the SHA-256 fingerprint is missing in Firebase.\n\nTip: Use a Test Phone Number (like +91 1111111111) to bypass this check.'
                );
            } else {
                Alert.alert('Error', error.message || 'Verification failed.');
            }
        } finally {
            setLoading(false);
        }
    }, [phone, canContinue, navigation, isNativeAuth]);



    return (
        <KeyboardAvoidingView
            style={styles.root}
            behavior={Platform.OS === 'ios' ? 'padding' : undefined}
            enabled={Platform.OS === 'ios'}
        >
            <StatusBar barStyle="light-content" backgroundColor="transparent" translucent />

            <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
                <View style={styles.inner}>

                    {/* ── HERO ── */}
                    <View style={styles.hero}>
                        <View style={[styles.arc, styles.arc1]} />
                        <View style={[styles.arc, styles.arc2]} />

                        <SafeAreaView style={styles.safeHero}>
                            <StepBar current={2} total={4} />
                        </SafeAreaView>

                        <View style={{ flex: 1 }} />

                        <View style={styles.heroBadge}>
                            <Text style={styles.heroBadgeEmoji}>🌾</Text>
                        </View>

                        <Text style={styles.heroEyebrow}>{t.step2}</Text>
                        <Text style={styles.heroTitle}>{t.whatsYourNumber}</Text>
                        <Text style={styles.heroSub}>
                            {t.enterNumberSub}
                        </Text>
                    </View>

                    {/* Curved connector */}
                    <View style={styles.connector}>
                        <View style={styles.connectorCurve} />
                    </View>

                    {/* ── BODY ── */}
                    <ScrollView
                        style={styles.bodyScroll}
                        contentContainerStyle={styles.bodyContent}
                        keyboardShouldPersistTaps="handled"
                        showsVerticalScrollIndicator={false}
                        bounces={false}
                    >

                        <Text style={styles.inputLabel}>{t.mobileNumber}</Text>

                        {/* ── Phone input field ── */}
                        <TouchableWithoutFeedback onPress={() => inputRef.current?.focus()}>
                            <Animated.View style={[styles.inputField, { borderColor }]}>

                                {/* +91 prefix */}
                                <View style={styles.prefix}>
                                    <Text style={styles.prefixFlag}>🇮🇳</Text>
                                    <Text style={styles.prefixCode}>+91</Text>
                                </View>
                                <View style={styles.prefixDivider} />

                                {/* Native TextInput — phone-pad triggers OS number keyboard */}
                                <TextInput
                                    ref={inputRef}
                                    style={styles.textInput}
                                    value={formattedPhone}
                                    onChangeText={(text) => {
                                        const digits = text.replace(/\D/g, '').slice(0, 10);
                                        setPhone(digits);
                                    }}
                                    onFocus={onFocus}
                                    onBlur={onBlur}
                                    keyboardType="phone-pad"
                                    returnKeyType="done"
                                    onSubmitEditing={handleSendOTP}
                                    placeholder="00000 00000"
                                    placeholderTextColor="rgba(26,46,10,0.18)"
                                    maxLength={11}
                                    selectionColor="#5a9c28"
                                    autoFocus={false}
                                    textContentType="telephoneNumber"
                                    importantForAutofill="yes"
                                />

                                {/* Clear button */}
                                {phone.length > 0 && (
                                    <TouchableOpacity
                                        style={styles.clearBtn}
                                        onPress={() => {
                                            setPhone('');
                                            inputRef.current?.focus();
                                        }}
                                        hitSlop={{ top: 10, bottom: 10, left: 12, right: 12 }}
                                    >
                                        <View style={styles.clearIcon}>
                                            <Text style={styles.clearIconText}>✕</Text>
                                        </View>
                                    </TouchableOpacity>
                                )}
                            </Animated.View>
                        </TouchableWithoutFeedback>

                        <Text style={styles.helperText}>
                            {t.otpSentViaSms}
                        </Text>

                        {/* Trust chips */}
                        <View style={styles.chipRow}>
                            <TrustChip label={t.securePrivate} />
                            <TrustChip label={t.smsOtp} />
                            <TrustChip label={t.freeToUse} />
                        </View>

                        <View style={{ flex: 1 }} />

                        {/* ── CTA ── */}
                        <View style={styles.ctaWrap}>
                            <TouchableOpacity
                                style={[styles.cta, !canContinue && styles.ctaDisabled]}
                                onPress={handleSendOTP}
                                disabled={!canContinue}
                                activeOpacity={0.88}
                            >
                                {loading ? (
                                    <ActivityIndicator color="#fff" size="small" />
                                ) : (
                                    <>
                                        <View style={styles.ctaLeft}>
                                            <Text style={styles.ctaLabel}>{t.getOtp}</Text>
                                            <Text style={styles.ctaSub} numberOfLines={1}>
                                                {canContinue
                                                    ? `${t.sendingTo} ${phone.slice(0, 5)} ${phone.slice(5)}`
                                                    : t.sendOtp}
                                            </Text>
                                        </View>
                                        <View style={styles.ctaArrow}>
                                            <Text style={styles.ctaArrowTxt}>→</Text>
                                        </View>
                                    </>
                                )}
                            </TouchableOpacity>

                            <Text style={styles.terms}>
                                {t.byContinuing}
                                <Text style={styles.termsLink}>{t.terms}</Text>
                                {t.and}
                                <Text style={styles.termsLink}>{t.privacyPolicy}</Text>
                            </Text>


                        </View>
                    </ScrollView>
                </View>
            </TouchableWithoutFeedback>
        </KeyboardAvoidingView>
    );
}

// ─────────────────────────────────────────────────────────
const styles = StyleSheet.create({
    root: { flex: 1, backgroundColor: '#1a2e0a' },
    inner: { flex: 1 },

    // Hero
    hero: {
        height: SCREEN_HEIGHT * 0.44, // Absolute height forces container to never slide up on Android
        backgroundColor: '#1a2e0a',
        paddingHorizontal: 28,
        paddingBottom: 40,
        position: 'relative',
        overflow: 'hidden',
    },
    safeHero: {
        paddingTop: Platform.OS === 'android' ? StatusBar.currentHeight + 10 : 20,
        paddingHorizontal: 0,
    },
    arc: {
        position: 'absolute',
        borderRadius: 999,
        borderWidth: 1.5,
        borderColor: 'rgba(122,182,72,0.07)',
    },
    arc1: { width: 300, height: 300, top: -110, right: -80 },
    arc2: { width: 160, height: 160, bottom: -40, left: -30 },

    heroBadge: {
        width: 64, height: 64,
        borderRadius: 20,
        backgroundColor: 'rgba(122,182,72,0.12)',
        borderWidth: 1,
        borderColor: 'rgba(122,182,72,0.2)',
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 18,
    },
    heroBadgeEmoji: { fontSize: 30 },
    heroEyebrow: {
        fontFamily: 'DMSans_500Medium',
        fontSize: 11,
        letterSpacing: 1.6,
        color: '#7ab648',
        marginBottom: 8,
    },
    heroTitle: {
        fontFamily: 'PlayfairDisplay_700Bold',
        fontSize: 34,
        color: '#fff',
        letterSpacing: -0.5,
        lineHeight: 40,
        marginBottom: 8,
    },
    heroSub: {
        fontFamily: 'NotoSansDevanagari_400Regular',
        fontSize: 13,
        color: 'rgba(255,255,255,0.38)',
    },

    // Connector
    connector: { height: 32, backgroundColor: '#1a2e0a' },
    connectorCurve: {
        flex: 1,
        backgroundColor: '#faf7f1',
        borderTopLeftRadius: 32,
        borderTopRightRadius: 32,
    },

    // Body
    bodyScroll: {
        flex: 1,
        backgroundColor: '#faf7f1',
    },
    bodyContent: {
        flexGrow: 1,
        minHeight: SCREEN_HEIGHT * 0.56 - 32,
        paddingHorizontal: 24,
        paddingTop: 28,
        paddingBottom: Platform.OS === 'ios' ? 36 : 24,
    },

    // Input
    inputLabel: {
        fontFamily: 'DMSans_500Medium',
        fontSize: 11,
        letterSpacing: 1.4,
        color: '#8aad5a',
        marginBottom: 10,
    },
    inputField: {
        flexDirection: 'row',
        alignItems: 'center',
        borderRadius: 18,
        borderWidth: 1.5,
        backgroundColor: '#fff',
        overflow: 'hidden',
        marginBottom: 10,
    },
    prefix: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        paddingHorizontal: 14,
        paddingVertical: 18,
        backgroundColor: '#f6fbf0',
    },
    prefixFlag: { fontSize: 18 },
    prefixCode: {
        fontFamily: 'DMSans_600SemiBold',
        fontSize: 16,
        color: '#3d7010',
    },
    prefixDivider: {
        width: 1.5,
        alignSelf: 'stretch',
        backgroundColor: '#e4edda',
    },
    textInput: {
        flex: 1,
        paddingHorizontal: 16,
        paddingVertical: 18,
        fontFamily: 'DMSans_500Medium',
        fontSize: 22,
        color: '#1a2e0a',
        letterSpacing: 1.5,
    },
    clearBtn: { paddingRight: 14, paddingLeft: 4 },
    clearIcon: {
        width: 22, height: 22,
        borderRadius: 11,
        backgroundColor: '#e8edde',
        alignItems: 'center',
        justifyContent: 'center',
    },
    clearIconText: {
        fontSize: 10,
        color: '#6b7c5a',
        fontWeight: '600',
    },
    helperText: {
        fontFamily: 'DMSans_400Regular',
        fontSize: 12,
        color: '#a8b89a',
        paddingLeft: 2,
        marginBottom: 20,
    },
    chipRow: {
        flexDirection: 'row',
        gap: 8,
        flexWrap: 'wrap',
    },

    // CTA
    ctaWrap: { paddingBottom: 0 },
    cta: {
        backgroundColor: '#1a2e0a',
        borderRadius: 18,
        height: 60,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingLeft: 24,
        paddingRight: 14,
        borderTopWidth: 1,
        borderTopColor: 'rgba(255,255,255,0.07)',
        marginBottom: 14,
    },
    ctaDisabled: { backgroundColor: '#c8d4c0' },
    ctaLeft: { flexDirection: 'column', alignItems: 'flex-start' },
    ctaLabel: {
        fontFamily: 'PlayfairDisplay_600SemiBold',
        fontSize: 17,
        color: '#fff',
        letterSpacing: 0.1,
    },
    ctaSub: {
        fontFamily: 'NotoSansDevanagari_400Regular',
        fontSize: 11,
        color: 'rgba(255,255,255,0.42)',
        marginTop: 1,
    },
    ctaArrow: {
        width: 40, height: 40,
        borderRadius: 12,
        alignItems: 'center',
        justifyContent: 'center',
    },
    ctaArrowTxt: { color: '#fff', fontSize: 18, fontWeight: '300' },
    terms: {
        fontFamily: 'DMSans_400Regular',
        fontSize: 11,
        color: '#b0c298',
        textAlign: 'center',
        lineHeight: 17,
    },
    termsLink: { color: '#5a9c28' },
});