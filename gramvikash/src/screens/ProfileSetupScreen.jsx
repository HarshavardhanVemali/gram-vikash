import React, { useState, useEffect } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    TouchableWithoutFeedback,
    TextInput,
    StatusBar,
    Platform,
    Keyboard,
    KeyboardAvoidingView,
    ScrollView,
    Dimensions,
    BackHandler
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { useBackHandler } from '../hooks/useBackHandler';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFarmerStore } from '../store';
import { getTranslations } from '../utils/translations';
import MicIcon from '../components/icons/MicIcon';
import LocationIcon from '../components/icons/LocationIcon';
import PaddyIcon from '../components/icons/PaddyIcon';
import * as Location from 'expo-location';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');

// ─────────────────────────────────────────────────────────
// Step progress bar
// ─────────────────────────────────────────────────────────
function StepBar({ current = 4, total = 4 }) {
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

export default function ProfileSetupScreen({ route, navigation }) {
    const { language } = useFarmerStore();
    const t = getTranslations(language);

    const prefill = route.params?.prefill || { name: '', village: '', district: '', state: '' };

    const [profile, setProfile] = useState({
        name: prefill.name,
        village: prefill.village,
        district: prefill.district,
        state: prefill.state
    });

    // Handle hardware back press – prevent going back to Identity Verification
    useBackHandler(() => true);

    const [micEnabled, setMicEnabled] = useState(true);
    const [locEnabled, setLocEnabled] = useState(true);
    const [isFetchingLocation, setIsFetchingLocation] = useState(false);

    useEffect(() => {
        // Only fetch automatically if the main location fields are empty
        if (!prefill.village && !prefill.district && !prefill.state) {
            fetchLocationAutomatic();
        }
    }, []);

    const fetchLocationAutomatic = async () => {
        setIsFetchingLocation(true);
        try {
            let { status } = await Location.requestForegroundPermissionsAsync();
            if (status !== 'granted') {
                setIsFetchingLocation(false);
                return;
            }

            let location = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
            if (location) {
                const [address] = await Location.reverseGeocodeAsync({
                    latitude: location.coords.latitude,
                    longitude: location.coords.longitude
                });

                if (address) {
                    setProfile(prev => ({
                        ...prev,
                        village: prev.village || address.city || address.subregion || '',
                        district: prev.district || address.subregion || address.city || '',
                        state: prev.state || address.region || ''
                    }));
                }
            }
        } catch (error) {
            console.error("Error fetching location:", error);
        } finally {
            setIsFetchingLocation(false);
        }
    };

    const handleFinish = () => {
        // In a real app, you would PATCH the profile to the backend here
        navigation.replace('MainTabs');
    };

    const canSubmit = profile.name?.length > 2 && profile.village?.length > 2;

    return (
        <KeyboardAvoidingView
            style={styles.root}
            behavior={Platform.OS === 'ios' ? 'padding' : undefined}
            enabled={Platform.OS === 'ios'}
        >
            <StatusBar barStyle="light-content" backgroundColor="transparent" translucent />

            <ScrollView
                contentContainerStyle={{ flexGrow: 1 }}
                bounces={false}
                keyboardShouldPersistTaps="handled"
                showsVerticalScrollIndicator={false}
            >
                <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
                    <View style={styles.inner}>

                        {/* ── HERO ── */}
                        <View style={styles.hero}>
                            <View style={[styles.arc, styles.arc1]} />
                            <View style={[styles.arc, styles.arc2]} />

                            <SafeAreaView style={styles.safeHero}>
                                <StepBar current={4} total={4} />
                            </SafeAreaView>

                            <View style={{ flex: 1 }} />

                            <View style={styles.heroBadge}>
                                <PaddyIcon size={28} color="#7ab648" />
                            </View>

                            <Text style={styles.heroEyebrow}>{t.step4 || 'STEP 4 OF 4'}</Text>
                            <Text style={styles.heroTitle}>{t.farmDetailsTitle || "Farm Details\n& Setup"}</Text>
                            <Text style={styles.heroSub}>{t.setupInstruction || "Finalize your profile to access all features."}</Text>
                        </View>

                        {/* Curved connector */}
                        <View style={styles.connector}>
                            <View style={styles.connectorCurve} />
                        </View>

                        {/* ── BODY ── */}
                        <View style={styles.body}>

                            <Text style={styles.sectionLabel}>{t.yourDetails || "YOUR DETAILS"}</Text>

                            <View style={styles.formGroup}>
                                <View style={styles.inputField}>
                                    <Text style={styles.fieldLabel}>{t.fullNamePlaceholder || "Full Name"}</Text>
                                    <TextInput
                                        style={styles.textInput}
                                        placeholder={t.enterName || "Enter your name"}
                                        placeholderTextColor="#a8b89a"
                                        value={profile.name}
                                        onChangeText={(v) => setProfile({ ...profile, name: v })}
                                    />
                                </View>

                                <View style={styles.inputField}>
                                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                                        <Text style={styles.fieldLabel}>{t.villagePlaceholder || "Village Name"}</Text>
                                        {isFetchingLocation && <Text style={{ fontSize: 10, color: '#5a9c28', fontStyle: 'italic' }}>Fetching location...</Text>}
                                    </View>
                                    <TextInput
                                        style={styles.textInput}
                                        placeholder={t.enterVillage || "Enter village"}
                                        placeholderTextColor="#a8b89a"
                                        value={profile.village}
                                        onChangeText={(v) => setProfile({ ...profile, village: v })}
                                    />
                                </View>

                                <View style={styles.splitRow}>
                                    <View style={[styles.inputField, { flex: 1, borderRightWidth: 1, borderRightColor: '#f0ece1' }]}>
                                        <Text style={styles.fieldLabel}>{t.districtPlaceholder || "District"}</Text>
                                        <TextInput
                                            style={styles.textInput}
                                            placeholder={t.enterDistrict || "District"}
                                            placeholderTextColor="#a8b89a"
                                            value={profile.district}
                                            onChangeText={(v) => setProfile({ ...profile, district: v })}
                                        />
                                    </View>
                                    <View style={[styles.inputField, { flex: 1 }]}>
                                        <Text style={styles.fieldLabel}>{t.statePlaceholder || "State"}</Text>
                                        <TextInput
                                            style={styles.textInput}
                                            placeholder={t.enterState || "State"}
                                            placeholderTextColor="#a8b89a"
                                            value={profile.state}
                                            onChangeText={(v) => setProfile({ ...profile, state: v })}
                                        />
                                    </View>
                                </View>
                            </View>

                            <Text style={[styles.sectionLabel, { marginTop: 32 }]}>{t.appPermissions || "APP PERMISSIONS"}</Text>

                            <View style={styles.permissionsGroup}>
                                <TouchableOpacity
                                    style={[styles.permCard, micEnabled && styles.permCardActive]}
                                    onPress={() => setMicEnabled(!micEnabled)}
                                    activeOpacity={0.7}
                                >
                                    <View style={styles.permIconWrap}>
                                        <MicIcon size={20} color={micEnabled ? "#5a9c28" : "#8aad5a"} />
                                    </View>
                                    <View style={styles.permTextWrap}>
                                        <Text style={styles.permTitle}>{t.microphone || "Microphone"}</Text>
                                        <Text style={styles.permSub}>{t.micSub || "For AI Krishi Voice Assistant"}</Text>
                                    </View>
                                    <View style={[styles.switch, micEnabled && styles.switchOn]}>
                                        <View style={[styles.switchKnob, micEnabled && styles.switchKnobOn]} />
                                    </View>
                                </TouchableOpacity>

                                <TouchableOpacity
                                    style={[styles.permCard, locEnabled && styles.permCardActive]}
                                    onPress={() => setLocEnabled(!locEnabled)}
                                    activeOpacity={0.7}
                                >
                                    <View style={styles.permIconWrap}>
                                        <LocationIcon size={20} color={locEnabled ? "#5a9c28" : "#8aad5a"} />
                                    </View>
                                    <View style={styles.permTextWrap}>
                                        <Text style={styles.permTitle}>{t.location || "Fine Location"}</Text>
                                        <Text style={styles.permSub}>{t.locSub || "For local weather & prices"}</Text>
                                    </View>
                                    <View style={[styles.switch, locEnabled && styles.switchOn]}>
                                        <View style={[styles.switchKnob, locEnabled && styles.switchKnobOn]} />
                                    </View>
                                </TouchableOpacity>
                            </View>

                            <View style={{ height: 40 }} />

                            {/* ── CTA ── */}
                            <TouchableOpacity
                                style={[styles.cta, !canSubmit && styles.ctaDisabled]}
                                onPress={handleFinish}
                                disabled={!canSubmit}
                                activeOpacity={0.88}
                            >
                                <View style={styles.ctaLeft}>
                                    <Text style={styles.ctaLabel}>{t.letsFarm || "Let's Farm!"}</Text>
                                    <Text style={styles.ctaSub} numberOfLines={1}>
                                        {canSubmit ? (t.profileReady || "Profile is ready") : (t.enterNameVillage || "Enter name & village")}
                                    </Text>
                                </View>
                                <View style={styles.ctaArrow}>
                                    <Text style={styles.ctaArrowTxt}>→</Text>
                                </View>
                            </TouchableOpacity>

                            <View style={{ height: Platform.OS === 'ios' ? 40 : 20 }} />
                        </View>
                    </View>
                </TouchableWithoutFeedback>
            </ScrollView>
        </KeyboardAvoidingView>
    );
}

const styles = StyleSheet.create({
    root: { flex: 1, backgroundColor: '#1a2e0a' },
    inner: { flex: 1 },

    // Hero Section
    hero: {
        height: SCREEN_HEIGHT * 0.4,
        backgroundColor: '#1a2e0a',
        paddingHorizontal: 28,
        paddingBottom: 20,
        position: 'relative',
        overflow: 'hidden',
    },
    safeHero: {
        paddingTop: Platform.OS === 'android' ? 34 : 20,
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
    sectionLabel: {
        fontFamily: 'DMSans_600SemiBold',
        fontSize: 11,
        letterSpacing: 1.2,
        color: '#8aad5a',
        marginBottom: 12,
        marginTop: 10,
    },

    // Form Redesign
    formGroup: {
        backgroundColor: '#fff',
        borderRadius: 20,
        borderWidth: 1,
        borderColor: '#ede8dc',
        overflow: 'hidden',
    },
    inputField: {
        paddingHorizontal: 20,
        paddingVertical: 12,
        borderBottomWidth: 1,
        borderBottomColor: '#f0ece1',
    },
    fieldLabel: {
        fontFamily: 'DMSans_500Medium',
        fontSize: 10,
        color: '#a8b89a',
        textTransform: 'uppercase',
        marginBottom: 4,
    },
    textInput: {
        fontFamily: 'DMSans_500Medium',
        fontSize: 16,
        color: '#1a2e0a',
        padding: 0,
    },
    splitRow: { flexDirection: 'row' },

    // Permissions
    permissionsGroup: { gap: 12 },
    permCard: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#fff',
        borderRadius: 18,
        padding: 14,
        borderWidth: 1,
        borderColor: '#ede8dc',
    },
    permCardActive: { borderColor: '#5a9c28', backgroundColor: '#f6fbf0' },
    permIconWrap: {
        width: 38, height: 38,
        borderRadius: 10,
        backgroundColor: '#f3f9ec',
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: 12,
    },
    permIcon: { fontSize: 18 },
    permTextWrap: { flex: 1 },
    permTitle: {
        fontFamily: 'DMSans_600SemiBold',
        fontSize: 14,
        color: '#1a2e0a',
    },
    permSub: {
        fontFamily: 'DMSans_400Regular',
        fontSize: 11,
        color: '#6b7c5a',
        marginTop: 1,
    },
    switch: {
        width: 40, height: 22,
        borderRadius: 11,
        backgroundColor: '#e4edda',
        padding: 3,
        justifyContent: 'center',
    },
    switchOn: { backgroundColor: '#5a9c28' },
    switchKnob: {
        width: 16, height: 16,
        borderRadius: 8,
        backgroundColor: '#fff',
    },
    switchKnobOn: { alignSelf: 'flex-end' },

    // CTA
    cta: {
        backgroundColor: '#1a2e0a',
        borderRadius: 20,
        height: 64,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingLeft: 24,
        paddingRight: 12,
    },
    ctaDisabled: { backgroundColor: '#c8d4c0' },
    ctaLeft: { flex: 1 },
    ctaLabel: {
        fontFamily: 'PlayfairDisplay_700Bold',
        fontSize: 18,
        color: '#fff',
    },
    ctaSub: {
        fontFamily: 'DMSans_400Regular',
        fontSize: 12,
        color: 'rgba(255,255,255,0.4)',
    },
    ctaArrow: {
        width: 40, height: 40,
        borderRadius: 14,
        alignItems: 'center',
        justifyContent: 'center',
    },
    ctaArrowTxt: { color: '#fff', fontSize: 18 },
});
