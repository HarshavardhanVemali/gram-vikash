import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
    View,
    Text,
    TextInput,
    TouchableOpacity,
    TouchableWithoutFeedback,
    StyleSheet,
    ActivityIndicator,
    Animated,
    Dimensions,
    StatusBar,
    Platform,
    Alert,
    Keyboard,
    KeyboardAvoidingView,
    ScrollView,
    BackHandler,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { useBackHandler } from '../hooks/useBackHandler';
import { useAuthStore, useFarmerStore } from '../store';
import { getTranslations } from '../utils/translations';
import { auth, confirm } from '../utils/firebase';
import { API_KEYS } from '../constants/apiKeys';
import { SafeAreaView } from 'react-native-safe-area-context';

const { width, height: SCREEN_HEIGHT } = Dimensions.get('window');

// ─────────────────────────────────────────────────────────
// Step progress bar
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
            {emoji && <Text style={chipStyles.emoji}>{emoji}</Text>}
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

export default function OTPVerificationScreen({ route, navigation }) {
    const { language } = useFarmerStore();
    const t = getTranslations(language);

    // Handle hardware back press - go back to login
    useBackHandler(() => {
        navigation.navigate('Login');
        return true;
    });

    const confirmationResult = useAuthStore(state => state.confirmationResult);
    const phoneNumber = useAuthStore(state => state.phoneNumber);
    const clearOtpSession = useAuthStore(state => state.clearOtpSession);

    const formattedPhone = phoneNumber?.startsWith('+91')
        ? `${phoneNumber.slice(0, 3)} ${phoneNumber.slice(3, 8)} ${phoneNumber.slice(8)}`
        : phoneNumber;

    const [otpArray, setOtpArray] = useState(['', '', '', '', '', '']);
    const [loading, setLoading] = useState(false);
    const [timer, setTimer] = useState(60); // Original timer was 60, edit suggests 30. Sticking to original for now.
    const inputs = useRef([]);
    const authLogin = useAuthStore(state => state.login);
    const setFarmer = useFarmerStore(state => state.setFarmer);

    // Shake Animation
    const shakeAnimation = useRef(new Animated.Value(0)).current;

    const triggerShake = useCallback(() => {
        Animated.sequence([
            Animated.timing(shakeAnimation, { toValue: 10, duration: 80, useNativeDriver: true }), // Original duration 80, edit suggests 50. Sticking to original.
            Animated.timing(shakeAnimation, { toValue: -10, duration: 80, useNativeDriver: true }),
            Animated.timing(shakeAnimation, { toValue: 10, duration: 80, useNativeDriver: true }),
            Animated.timing(shakeAnimation, { toValue: 0, duration: 80, useNativeDriver: true })
        ]).start();
    }, [shakeAnimation]);

    useEffect(() => {
        let interval = setInterval(() => {
            setTimer((prevTimer) => (prevTimer > 0 ? prevTimer - 1 : 0));
        }, 1000);
        return () => clearInterval(interval);
    }, []); // Original useEffect had empty dependency array, edit suggests [timer]. Sticking to original.

    const handleResend = () => {
        if (timer > 0 || loading) return;
        // In a real app we'd trigger signInWithPhoneNumber again here
        // For now, just reset the timer and array to simulate
        setOtpArray(['', '', '', '', '', '']);
        setTimer(60); // Original timer was 60, edit suggests 30. Sticking to original.
        inputs.current[0]?.focus();
    };

    const handleOtpChange = (value, index) => {
        const newOtpArray = [...otpArray];
        // Allow numeric only
        const cleanValue = value.replace(/[^0-9]/g, '');
        newOtpArray[index] = cleanValue;
        setOtpArray(newOtpArray);

        // Auto-advance
        if (cleanValue && index < 5) {
            inputs.current[index + 1]?.focus();
        }

        // Auto-submit
        if (cleanValue && index === 5) {
            inputs.current[index]?.blur();
            // Call submit on next tick to allow state update
            setTimeout(() => submitOTP(newOtpArray.join('')), 50);
        }
    };

    const handleKeyPress = (e, index) => {
        if (e.nativeEvent.key === 'Backspace' && !otpArray[index] && index > 0) {
            inputs.current[index - 1]?.focus();
        }
    };

    const submitOTP = async (codeToVerify) => {
        if (codeToVerify.length !== 6) return;
        Keyboard.dismiss();
        setLoading(true);

        try {
            if (!confirmationResult) {
                throw new Error('Verification session expired. Please go back and resend.');
            }

            console.log('Firebase: Verifying code...');
            const userCredential = await confirm(confirmationResult, codeToVerify);
            const user = userCredential.user;
            const idToken = await user.getIdToken();

            console.log('Backend: Syncing Firebase ID token...');
            const response = await fetch(`${API_KEYS.API_URL}/api/farmers/auth/firebase/`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ idToken }),
            });

            if (!response.ok) {
                const errData = await response.json();
                throw new Error(errData.error || 'Backend synchronization failed.');
            }

            const result = await response.json();
            console.log('Backend result:', result);

            clearOtpSession();
            authLogin({ access: result.access, refresh: result.refresh });
            setFarmer(result.farmer);

            console.log('Redirecting, is_new_farmer:', result.is_new_farmer, 'Name:', result.farmer?.name, 'Linked:', result.farmer?.digilocker_linked);

            // Redirect to onboarding if new farmer OR profile is incomplete
            if (result.is_new_farmer || !result.farmer?.name || !result.farmer?.digilocker_linked) {
                navigation.replace('IdentityVerification');
            } else {
                navigation.replace('MainTabs');
            }
        } catch (error) {
            triggerShake();
            setOtpArray(['', '', '', '', '', '']);
            inputs.current[0]?.focus();

            console.error('Auth Error:', error);
            if (error.code === 'auth/invalid-verification-code') {
                Alert.alert(t.invalidCodeTitle || 'Invalid OTP', 'The code you entered is incorrect.');
            } else if (error.code === 'auth/code-expired') {
                Alert.alert(t.expired || 'Code Expired', 'Please resend the OTP.');
            } else {
                Alert.alert(t.verificationFailedTitle || 'Verification Failed', error.message || 'Unknown error.');
            }
        } finally {
            setLoading(false);
        }
    };

    const canSubmit = otpArray.join('').length === 6 && !loading;

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
                            <Text style={styles.heroBadgeEmoji}>💬</Text>
                        </View>

                        <Text style={styles.heroEyebrow}>{t.step2}</Text>
                        <Text style={styles.heroTitle}>{t.verifyYourNumber}</Text>
                        <Text style={styles.heroSub}>
                            {t.enterCodeSentTo} {formattedPhone}
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
                        bounces={false}
                        keyboardShouldPersistTaps="handled"
                        showsVerticalScrollIndicator={false}
                    >
                        <View style={styles.otpHeaderRow}>
                            <Text style={styles.inputLabel}>{t.enterOtpCode}</Text>
                            <Text style={styles.timerText}>
                                {timer > 0 ? `00:${timer.toString().padStart(2, '0')}` : t.expired}
                            </Text>
                        </View>

                        {/* ── Phone input fields (6 digit OTP) ── */}
                        <Animated.View style={[styles.otpRow, { transform: [{ translateX: shakeAnimation }] }]}>
                            {otpArray.map((digit, index) => (
                                <View key={index} style={styles.otpBoxWrapper}>
                                    <TextInput
                                        ref={(ref) => inputs.current[index] = ref}
                                        style={[
                                            styles.otpInput,
                                            digit ? styles.otpInputActive : null,
                                            loading ? styles.otpInputDisabled : null
                                        ]}
                                        keyboardType="number-pad"
                                        maxLength={1}
                                        value={digit}
                                        onChangeText={(value) => handleOtpChange(value, index)}
                                        onKeyPress={(e) => handleKeyPress(e, index)}
                                        editable={!loading}
                                        selectTextOnFocus
                                        textContentType="oneTimeCode"
                                        selectionColor="#5a9c28"
                                    />
                                </View>
                            ))}
                        </Animated.View>

                        {/* Helper Text and Resend */}
                        <View style={styles.helperRow}>
                            <Text style={styles.helperText}>
                                {t.didntReceiveCode}
                            </Text>
                            <TouchableOpacity
                                onPress={handleResend}
                                disabled={timer > 0 || loading}
                                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                            >
                                <Text style={[
                                    styles.resendText,
                                    (timer > 0 || loading) && styles.resendDisabled
                                ]}>
                                    {timer > 0 ? `${t.wait} ${timer}s` : t.resendOtp}
                                </Text>
                            </TouchableOpacity>
                        </View>

                        {/* Trust chips */}
                        <View style={styles.chipRow}>
                            <TrustChip label={t.securePrivate} />
                            <TrustChip label={t.autoVerifying} />
                        </View>

                        <View style={{ flex: 1 }} />

                        {/* ── CTA ── */}
                        <View style={styles.ctaWrap}>
                            <TouchableOpacity
                                style={[styles.cta, !canSubmit && styles.ctaDisabled]}
                                onPress={() => submitOTP(otpArray.join(''))}
                                disabled={!canSubmit}
                                activeOpacity={0.88}
                            >
                                {loading ? (
                                    <ActivityIndicator color="#fff" size="small" />
                                ) : (
                                    <>
                                        <View style={styles.ctaLeft}>
                                            <Text style={styles.ctaLabel}>{t.verifyAccount}</Text>
                                            <Text style={styles.ctaSub} numberOfLines={1}>
                                                {canSubmit
                                                    ? t.processingSecurely
                                                    : t.enterOtp}
                                            </Text>
                                        </View>
                                        <View style={styles.ctaArrow}>
                                            <Text style={styles.ctaArrowTxt}>→</Text>
                                        </View>
                                    </>
                                )}
                            </TouchableOpacity>
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
        height: SCREEN_HEIGHT * 0.44,
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
        lineHeight: 20,
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

    // Input fields formatting
    otpHeaderRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 10,
    },
    inputLabel: {
        fontFamily: 'DMSans_500Medium',
        fontSize: 11,
        letterSpacing: 1.4,
        color: '#8aad5a',
    },
    timerText: {
        fontFamily: 'DMSans_700Bold',
        fontSize: 13,
        color: '#d68b36',
    },

    otpRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: 16,
    },
    otpBoxWrapper: {
        width: (width - 48 - 40) / 6, // Total width minus paddings minus gaps
        aspectRatio: 0.8,
    },
    otpInput: {
        flex: 1,
        borderWidth: 1.5,
        borderColor: '#ede8dc',
        backgroundColor: '#fff',
        borderRadius: 14,
        fontFamily: 'DMSans_600SemiBold',
        fontSize: 24,
        color: '#1a2e0a',
        textAlign: 'center',
        lineHeight: 28, // Fix for some Android devices where text shifts vertically
    },
    otpInputActive: {
        borderColor: '#5a9c28',
        backgroundColor: '#f6fbf0',
    },
    otpInputDisabled: {
        opacity: 0.6,
        backgroundColor: '#f0ece1',
    },

    helperRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 24,
    },
    helperText: {
        fontFamily: 'DMSans_400Regular',
        fontSize: 13,
        color: '#a8b89a',
        marginRight: 6,
    },
    resendText: {
        fontFamily: 'DMSans_600SemiBold',
        fontSize: 13,
        color: '#5a9c28',
    },
    resendDisabled: {
        color: '#c4d1b8',
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
    ctaArrowTxt: { color: '#fff', fontSize: 18 },
});
