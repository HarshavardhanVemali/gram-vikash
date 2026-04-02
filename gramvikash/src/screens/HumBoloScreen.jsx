import React, { useState, useEffect, useRef } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    StatusBar,
    Animated,
    ScrollView,
    Dimensions,
    Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { useBackHandler } from '../hooks/useBackHandler';
import { Audio } from 'expo-av';
import * as Speech from 'expo-speech';
import * as FileSystem from 'expo-file-system/legacy';
import { useFarmerStore } from '../store';
import { getUI } from '../utils/translations';

const { width } = Dimensions.get('window');

// ── Gemini 2.5 Flash (supports generateContent + audio input) ─────────────────
// NOTE: gemini-2.5-flash-native-audio-preview is a Live API (WebSocket) model —
//       it does NOT support the generateContent REST endpoint.
//       gemini-2.5-flash supports audio input via generateContent and is the
//       correct model for this record-then-send approach.
const GEMINI_API_KEY = process.env.EXPO_PUBLIC_GEMINI_API_KEY;
const GEMINI_MODEL = 'gemini-2.5-flash';
const GEMINI_URL = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${GEMINI_API_KEY}`;

// ── Silence detection config ──────────────────────────────────────────────────
const SILENCE_THRESHOLD_DB = -38;   // dB below which is considered silence
const SILENCE_DURATION_MS = 2000;  // Auto-send after 2 s of silence
const MIN_RECORD_MS = 1500;  // Don't auto-send before 1.5 s of recording
const COUNTDOWN_STEPS = 2;     // Countdown steps (seconds)

// ── Language Configuration ────────────────────────────────────────────────────
const LANGUAGES = [
    { key: 'hi', label: 'हिन्दी', name: 'Hindi', tts: 'hi-IN' },
    { key: 'mr', label: 'मराठी', name: 'Marathi', tts: 'mr-IN' },
    { key: 'en', label: 'English', name: 'English', tts: 'en-IN' },
    { key: 'te', label: 'తెలుగు', name: 'Telugu', tts: 'te-IN' },
    { key: 'ta', label: 'தமிழ்', name: 'Tamil', tts: 'ta-IN' },
    { key: 'kn', label: 'ಕನ್ನಡ', name: 'Kannada', tts: 'kn-IN' },
    { key: 'gu', label: 'ગુજરાતી', name: 'Gujarati', tts: 'gu-IN' },
    { key: 'bn', label: 'বাংলা', name: 'Bengali', tts: 'bn-IN' },
    { key: 'pa', label: 'ਪੰਜਾਬੀ', name: 'Punjabi', tts: 'pa-IN' },
    { key: 'ml', label: 'മലയാളം', name: 'Malayalam', tts: 'ml-IN' },
    { key: 'ur', label: 'اردو', name: 'Urdu', tts: 'ur-IN' },
];

// --- Localized strings moved to translations.js ---

const STATE = { IDLE: 'IDLE', CONNECTING: 'CONNECTING', INCALL: 'INCALL', ENDED: 'ENDED' };

// ── Fallback replies per language ─────────────────────────────────────────────
const FALLBACKS = {
    hi: 'माफ़ करें, मैं अभी जवाब नहीं दे पा रहा हूँ। कृपया दोबारा कोशिश करें।',
    mr: 'माफ करा, मी सध्या उत्तर देऊ शकत नाही. कृपया पुन्हा प्रयत्न करा.',
    en: 'Sorry, I could not get a response. Please try again.',
    te: 'క్షమించండి, నేను ఇప్పుడు సమాధానం ఇవ్వలేకపోతున్నాను. దయచేసి మళ్ళీ ప్రయత్నించండి.',
    ta: 'மன்னிக்கவும், இப்போது பதில் வழங்க முடியவில்லை. மீண்டும் முயற்சிக்கவும்.',
    kn: 'ಕ್ಷಮಿಸಿ, ಈಗ ಉತ್ತರ ನೀಡಲು ಸಾಧ್ಯವಿಲ್ಲ. ದಯವಿಟ್ಟು ಮತ್ತೆ ಪ್ರಯತ್ನಿಸಿ.',
    gu: 'માફ કરો, હું હમણાં જવાબ આપી શકતો નથી. કૃપા કરીને ફરી પ્રયાસ કરો.',
    bn: 'দুঃখিত, এখন উত্তর দিতে পারছি না। আবার চেষ্টা করুন।',
    pa: 'ਮਾਫ਼ ਕਰਨਾ, ਮੈਂ ਹੁਣੇ ਜਵਾਬ ਦੇਣ ਵਿੱਚ ਅਸਮਰੱਥ ਹਾਂ। ਕਿਰਪਾ ਕਰਕੇ ਦੁਬਾਰਾ ਕੋਸ਼ਿਸ਼ ਕਰੋ।',
    ml: 'ക്ഷമിക്കണം, ഇപ്പോൾ ഉത്തരം നൽകാൻ കഴിയുന്നില്ല. വീണ്ടും ശ്രമിക്കൂ.',
    ur: 'معذرت، میں ابھی جواب نہیں دے سکتا۔ براہ کرم دوبارہ کوشش کریں۔',
};

export default function HumBoloScreen() {
    const navigation = useNavigation();

    const [phase, setPhase] = useState(STATE.IDLE);
    const { language: storedLang, updateLanguage } = useFarmerStore();
    const t = getUI(storedLang);
    const [selectedLang, setSelectedLang] = useState(LANGUAGES.find(l => l.key === storedLang) || LANGUAGES[0]);
    const [aiReply, setAiReply] = useState('');
    const [conversation, setConversation] = useState([]);
    const [silenceCountdown, setSilenceCountdown] = useState(null); // ← fixed: now properly declared

    const recordingRef = useRef(null);
    const silenceTimerRef = useRef(null);
    const countdownIntervalRef = useRef(null);
    const recordStartTimeRef = useRef(null);
    const isProcessingRef = useRef(false);

    const pulseAnim = useRef(new Animated.Value(1)).current;
    const waveAnims = useRef(Array.from({ length: 9 }, () => new Animated.Value(8))).current;

    // Use global 't' for UI, fallback to local selectedLang for AI logic
    const ui = {
        idle: t.humBoloIdle,
        listening: t.humBoloListening,
        thinking: t.humBoloThinking,
        speaking: t.humBoloSpeaking,
        stop: t.humBoloStop,
        retry: t.humBoloRetry,
        tapHint: t.humBoloTapHint,
        stopHint: t.humBoloStopHint,
        lang: t.humBoloSelectLang,
        placeholder: t.humBoloPlaceholder,
        autoSend: t.humBoloAutoSend,
        sendingIn: t.humBoloSendingIn
    };

    useBackHandler(() => { Speech.stop(); navigation.goBack(); return true; });

    // Cleanup on unmount
    useEffect(() => {
        return () => {
            clearSilenceTimers();
            Speech.stop();
            if (recordingRef.current) {
                recordingRef.current.stopAndUnloadAsync().catch(() => { });
            }
        };
    }, []);

    // ── Animations ────────────────────────────────────────────────────────────
    useEffect(() => {
        if (phase === STATE.INCALL || phase === STATE.CONNECTING) {
            const pulse = Animated.loop(
                Animated.sequence([
                    Animated.timing(pulseAnim, { toValue: 1.22, duration: 650, useNativeDriver: true }),
                    Animated.timing(pulseAnim, { toValue: 1.0, duration: 650, useNativeDriver: true }),
                ])
            );
            pulse.start();
            const waves = waveAnims.map((anim, i) =>
                Animated.loop(
                    Animated.sequence([
                        Animated.timing(anim, { toValue: 18 + i * 5, duration: 300 + i * 70, useNativeDriver: false }),
                        Animated.timing(anim, { toValue: 6 + i * 2, duration: 300 + i * 70, useNativeDriver: false }),
                    ])
                )
            );
            waves.forEach(w => w.start());
            return () => { pulse.stop(); waves.forEach(w => w.stop()); };
        } else {
            pulseAnim.setValue(1);
            waveAnims.forEach(a => a.setValue(8));
        }
    }, [phase]);

    // ── Call Logic ───────────────────────────────────────────────────────────
    const triggerExotelCall = async () => {
        setPhase(STATE.CONNECTING);
        try {
            const token = await fasaldocService.getAuthToken();
            if (!token) {
                Alert.alert('Error', 'Please login to use this feature');
                setPhase(STATE.IDLE);
                return;
            }

            const response = await fetch(`${process.env.EXPO_PUBLIC_API_URL}/api/call/trigger/`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                }
            });

            if (response.ok) {
                setPhase(STATE.INCALL);
                Alert.alert('Outgoing Call', 'You will receive a call from GramVikash shortly. Please answer to talk to our AI Agent.');
            } else {
                const err = await response.text();
                throw new Error(err);
            }
        } catch (e) {
            console.error('Call trigger error:', e);
            Alert.alert('Call Failed', 'Could not initiate the call. Please check your connection.');
            setPhase(STATE.IDLE);
        }
    };

    const handleMicPress = async () => {
        if (phase === STATE.IDLE || phase === STATE.ENDED) {
            await triggerExotelCall();
        } else if (phase === STATE.INCALL || phase === STATE.CONNECTING) {
            setPhase(STATE.IDLE);
        }
    };

    // ── Helpers ───────────────────────────────────────────────────────────────
    const getMicColor = () => {
        switch (phase) {
            case STATE.CONNECTING: return '#f59e0b';
            case STATE.INCALL: return '#ef4444';
            case STATE.ENDED: return '#6b7280';
            default: return '#16a34a';
        }
    };

    const getStatusTexts = () => {
        switch (phase) {
            case STATE.CONNECTING: return { main: 'Connecting...', sub: 'Dialing ExoPhone' };
            case STATE.INCALL: return { main: 'On Call', sub: 'Speaking to GramVikash AI' };
            case STATE.ENDED: return { main: 'Call Ended', sub: 'Talk to you soon!' };
            default: return { main: ui.idle, sub: ui.idleEn };
        }
    };

    const status = getStatusTexts();

    // ── Render ────────────────────────────────────────────────────────────────
    return (
        <SafeAreaView style={styles.safe}>
            <StatusBar barStyle="light-content" backgroundColor="#0f1f07" />
            <View style={styles.container}>

                {/* ── Header ── */}
                <View style={styles.header}>
                    <TouchableOpacity
                        onPress={() => { Speech.stop(); navigation.goBack(); }}
                        style={styles.backBtn}
                    >
                        <Ionicons name="chevron-back" size={22} color="#ffffff" />
                    </TouchableOpacity>
                    <View style={styles.headerCenter}>
                        <Text style={styles.headerTitle}>HumBolo</Text>
                        <View style={styles.langBadge}>
                            <Text style={styles.langBadgeText}>{selectedLang.label}</Text>
                        </View>
                    </View>
                    <View style={{ width: 40 }} />
                </View>

                {/* ── Reply area ── */}
                <ScrollView
                    style={styles.replyScroll}
                    contentContainerStyle={styles.replyScrollContent}
                    showsVerticalScrollIndicator={false}
                >
                    {aiReply ? (
                        <View style={styles.replyBubble}>
                            <View style={styles.replyIconRow}>
                                <Ionicons name="leaf" size={14} color="#4ade80" />
                                <Text style={styles.replyLabel}>HumBolo · {selectedLang.label}</Text>
                            </View>
                            <Text style={styles.replyText}>{aiReply}</Text>
                        </View>
                    ) : (
                        <Text style={styles.tipText}>{ui.placeholder}</Text>
                    )}
                </ScrollView>

                {/* ── Interaction area ── */}
                <View style={styles.content}>

                    {/* Status text */}
                    <View style={styles.aiStatus}>
                        <Text style={styles.subStatus}>{status.sub}</Text>
                        <Text style={styles.mainStatus}>{status.main}</Text>
                    </View>

                    {/* Waveform bars */}
                    <View style={styles.waveContainer}>
                        {waveAnims.map((anim, i) => (
                            <Animated.View
                                key={i}
                                style={[
                                    styles.waveBar,
                                    {
                                        height: anim,
                                        backgroundColor: getMicColor(),
                                        opacity: phase !== STATE.IDLE ? 1 : 0.22,
                                    },
                                ]}
                            />
                        ))}
                    </View>

                    {/* Mic button */}
                    <TouchableOpacity
                        onPress={handleMicPress}
                        activeOpacity={0.85}
                        style={styles.micOuter}
                        disabled={phase === STATE.PROCESSING}
                    >
                        <Animated.View
                            style={[
                                styles.micInner,
                                { backgroundColor: getMicColor(), shadowColor: getMicColor() },
                                { transform: [{ scale: pulseAnim }] },
                            ]}
                        >
                            <Ionicons
                                name={
                                    phase === STATE.CONNECTING ? 'phone-portrait' :
                                        phase === STATE.INCALL ? 'call' : 'mic'
                                }
                                size={46}
                                color="#ffffff"
                            />
                        </Animated.View>
                    </TouchableOpacity>

                    {/* Hint / Stop button */}
                    <View style={styles.hintArea}>
                        {(phase === STATE.INCALL || phase === STATE.CONNECTING) && (
                            <TouchableOpacity onPress={() => setPhase(STATE.IDLE)} style={styles.stopBtn}>
                                <Ionicons name="close-circle" size={16} color="#ffffff" />
                                <Text style={styles.stopBtnText}>Cancel</Text>
                            </TouchableOpacity>
                        )}
                    </View>
                </View>

                {/* ── Language selector ── */}
                <View style={styles.langSection}>
                    <Text style={styles.langSectionLabel}>{ui.lang}</Text>
                    <ScrollView
                        horizontal
                        showsHorizontalScrollIndicator={false}
                        contentContainerStyle={styles.langScroll}
                    >
                        {LANGUAGES.map((lang) => {
                            const isActive = selectedLang.key === lang.key;
                            return (
                                <TouchableOpacity
                                    key={lang.key}
                                    onPress={() => {
                                        setSelectedLang(lang);
                                        updateLanguage(lang.key);
                                        setAiReply('');
                                        clearSilenceTimers();
                                    }}
                                    style={[styles.langChip, isActive && styles.langChipActive]}
                                >
                                    <Text style={[styles.langChipText, isActive && styles.langChipTextActive]}>
                                        {lang.label}
                                    </Text>
                                    {isActive && (
                                        <Ionicons
                                            name="checkmark-circle"
                                            size={13}
                                            color="#1a2e0a"
                                            style={{ marginLeft: 4 }}
                                        />
                                    )}
                                </TouchableOpacity>
                            );
                        })}
                    </ScrollView>
                </View>

            </View>
        </SafeAreaView>
    );
}

// ── Styles ────────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
    safe: { flex: 1, backgroundColor: '#0f1f07' },
    container: { flex: 1 },

    // Header
    header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingTop: 8, height: 60 },
    backBtn: { padding: 4, width: 40 },
    headerCenter: { alignItems: 'center', gap: 4 },
    headerTitle: { fontSize: 20, fontFamily: 'PlayfairDisplay_700Bold', color: '#ffffff' },
    langBadge: { backgroundColor: 'rgba(22,163,74,0.25)', paddingHorizontal: 10, paddingVertical: 3, borderRadius: 10, borderWidth: 1, borderColor: 'rgba(22,163,74,0.4)' },
    langBadgeText: { fontSize: 11, color: '#4ade80', fontFamily: 'DMSans_500Medium' },

    // Reply
    replyScroll: { maxHeight: 155, marginHorizontal: 18, marginBottom: 6 },
    replyScrollContent: { paddingVertical: 6 },
    replyBubble: { backgroundColor: 'rgba(255,255,255,0.07)', borderRadius: 20, padding: 16, borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)' },
    replyIconRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 8, gap: 5 },
    replyLabel: { fontSize: 11, color: '#4ade80', fontFamily: 'DMSans_600SemiBold', letterSpacing: 0.4 },
    replyText: { fontSize: 15, color: '#ffffff', fontFamily: 'NotoSansDevanagari_400Regular', lineHeight: 24 },
    tipText: { textAlign: 'center', fontSize: 13, fontFamily: 'Lora_400Regular_Italic', color: 'rgba(255,255,255,0.3)', paddingVertical: 20 },

    // Content
    content: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 24 },
    aiStatus: { alignItems: 'center', marginBottom: 16 },
    subStatus: { fontSize: 13, color: 'rgba(255,255,255,0.45)', fontFamily: 'DMSans_400Regular' },
    mainStatus: { fontSize: 26, color: '#ffffff', fontFamily: 'NotoSansDevanagari_700Bold', marginTop: 4 },

    // Silence countdown badge
    countdownBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        backgroundColor: 'rgba(249,115,22,0.18)',
        borderWidth: 1,
        borderColor: 'rgba(249,115,22,0.45)',
        borderRadius: 22,
        paddingHorizontal: 18,
        paddingVertical: 8,
        marginBottom: 10,
    },
    countdownText: { fontSize: 24, color: '#f97316', fontFamily: 'PlayfairDisplay_700Bold' },
    countdownSub: { fontSize: 13, color: '#f97316', fontFamily: 'DMSans_500Medium' },

    // Waves
    waveContainer: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', height: 64, gap: 5, marginBottom: 28 },
    waveBar: { width: 4, borderRadius: 2 },

    // Mic
    micOuter: { width: 148, height: 148, borderRadius: 74, backgroundColor: 'rgba(255,255,255,0.04)', alignItems: 'center', justifyContent: 'center', borderWidth: 1.2, borderColor: 'rgba(255,255,255,0.1)' },
    micInner: { width: 104, height: 104, borderRadius: 52, alignItems: 'center', justifyContent: 'center', elevation: 14, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.6, shadowRadius: 20 },

    // Hint
    hintArea: { minHeight: 44, alignItems: 'center', justifyContent: 'center', marginTop: 16 },
    hintText: { fontSize: 13, color: 'rgba(255,255,255,0.38)', fontFamily: 'DMSans_400Regular' },
    stopBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: 'rgba(255,255,255,0.1)', paddingHorizontal: 20, paddingVertical: 10, borderRadius: 22 },
    stopBtnText: { color: '#ffffff', fontFamily: 'NotoSansDevanagari_600SemiBold', fontSize: 14 },

    // Language
    langSection: { paddingBottom: 30 },
    langSectionLabel: { paddingHorizontal: 22, fontSize: 11, color: 'rgba(255,255,255,0.35)', fontFamily: 'DMSans_500Medium', marginBottom: 10, letterSpacing: 0.5, textTransform: 'uppercase' },
    langScroll: { paddingHorizontal: 18 },
    langChip: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 9, borderRadius: 25, backgroundColor: 'rgba(255,255,255,0.06)', marginHorizontal: 4, borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)' },
    langChipActive: { backgroundColor: '#ffffff', borderColor: '#ffffff' },
    langChipText: { color: '#ffffff', fontSize: 14, fontFamily: 'NotoSansDevanagari_400Regular' },
    langChipTextActive: { color: '#1a2e0a', fontFamily: 'NotoSansDevanagari_600SemiBold' },
});