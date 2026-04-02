import React, { useState, useEffect, useRef } from 'react';
import {
    View,
    Text,
    StyleSheet,
    ScrollView,
    TouchableOpacity,
    StatusBar,
    Dimensions,
    Image,
    ActivityIndicator,
    Alert,
    Animated,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { useBackHandler } from '../hooks/useBackHandler';
import * as ImagePicker from 'expo-image-picker';
import * as FileSystem from 'expo-file-system/legacy';
import * as Speech from 'expo-speech';
import { Audio } from 'expo-av';
import { auth } from '../utils/firebase';
import { fasaldocService } from '../services/fasaldocService';
import { useFarmerStore } from '../store';
import { getUI } from '../utils/translations';

const { width } = Dimensions.get('window');

// ── Gemini Config ─────────────────────────────────────────────────────────────
const GEMINI_API_KEY = process.env.EXPO_PUBLIC_GEMINI_API_KEY;

// Vision model for image analysis
const VISION_MODEL = 'gemini-2.5-flash';
const VISION_URL = `https://generativelanguage.googleapis.com/v1beta/models/${VISION_MODEL}:generateContent?key=${GEMINI_API_KEY}`;

// Voice Q&A model (audio input, text output)
const VOICE_MODEL = 'gemini-2.5-flash';
const VOICE_URL = `https://generativelanguage.googleapis.com/v1beta/models/${VOICE_MODEL}:generateContent?key=${GEMINI_API_KEY}`;

// ── Silence detection ─────────────────────────────────────────────────────────
const SILENCE_THRESHOLD_DB = -38;
const SILENCE_DURATION_MS = 4000;
const MIN_RECORD_MS = 1200;
const COUNTDOWN_STEPS = 4;

// ── Languages ─────────────────────────────────────────────────────────────────
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

// ── App States ────────────────────────────────────────────────────────────────
const SCREEN = {
    CAPTURE: 'CAPTURE',
    ANALYZING: 'ANALYZING',
    RESULTS: 'RESULTS',   // initial results + TTS autoplay
    CHAT: 'CHAT',      // ongoing voice Q&A
};

const VOICE_STATE = {
    IDLE: 'IDLE',
    RECORDING: 'RECORDING',
    PROCESSING: 'PROCESSING',
    SPEAKING: 'SPEAKING',
};

const FALLBACKS = {
    hi: 'माफ करें, कोई त्रुटि हुई। कृपया दोबारा पूछें।',
    mr: 'माफ करा, कृपया पुन्हा विचारा.',
    en: 'Sorry, an error occurred. Please try again.',
    te: 'క్షమించండి, దయచేసి మళ్ళీ అడగండి.',
    ta: 'மன்னிக்கவும், மீண்டும் முயற்சிக்கவும்.',
    default: 'Sorry, please try again.',
};

// ─────────────────────────────────────────────────────────────────────────────
export default function FasalDocScreen() {
    const navigation = useNavigation();

    // Screen flow
    const [screen, setScreen] = useState(SCREEN.CAPTURE);
    const [scanMode, setScanMode] = useState('CROP');
    const { language: storedLang } = useFarmerStore();
    const t = getUI(storedLang);
    const [selectedLang, setSelectedLang] = useState(LANGUAGES.find(l => l.key === storedLang) || LANGUAGES[0]);
    const [imageUri, setImageUri] = useState(null);
    const [imageBase64, setImageBase64] = useState(null); // keep for context in Q&A

    // Diagnosis result
    const [diagnosis, setDiagnosis] = useState(null);

    // TTS for results
    const [isSpeaking, setIsSpeaking] = useState(false);

    // Voice Q&A
    const [voiceState, setVoiceState] = useState(VOICE_STATE.IDLE);
    const [silenceCountdown, setSilenceCountdown] = useState(null);
    const [chatHistory, setChatHistory] = useState([]); // [{role, text}]
    const [currentReply, setCurrentReply] = useState('');

    // Refs
    const recordingRef = useRef(null);
    const silenceTimerRef = useRef(null);
    const countdownIntervalRef = useRef(null);
    const recordStartRef = useRef(null);
    const isProcessingRef = useRef(false);

    // Animations
    const pulseAnim = useRef(new Animated.Value(1)).current;
    const waveAnims = useRef(Array.from({ length: 7 }, () => new Animated.Value(6))).current;

    // const ui = getUI(selectedLang); // Removed as 't' is now used

    // ── Cleanup ───────────────────────────────────────────────────────────────
    useEffect(() => {
        return () => {
            Speech.stop();
            clearSilenceTimers();
            if (recordingRef.current) recordingRef.current.stopAndUnloadAsync().catch(() => { });
        };
    }, []);

    useBackHandler(() => {
        if (screen !== SCREEN.CAPTURE) { resetAll(); return true; }
        return false;
    });

    // ── Wave animations ───────────────────────────────────────────────────────
    useEffect(() => {
        if (voiceState === VOICE_STATE.RECORDING || voiceState === VOICE_STATE.SPEAKING) {
            const pulse = Animated.loop(Animated.sequence([
                Animated.timing(pulseAnim, { toValue: 1.18, duration: 600, useNativeDriver: true }),
                Animated.timing(pulseAnim, { toValue: 1.0, duration: 600, useNativeDriver: true }),
            ]));
            pulse.start();
            const waves = waveAnims.map((anim, i) => Animated.loop(Animated.sequence([
                Animated.timing(anim, { toValue: 16 + i * 4, duration: 280 + i * 60, useNativeDriver: false }),
                Animated.timing(anim, { toValue: 4 + i * 2, duration: 280 + i * 60, useNativeDriver: false }),
            ])));
            waves.forEach(w => w.start());
            return () => { pulse.stop(); waves.forEach(w => w.stop()); };
        } else {
            pulseAnim.setValue(1);
            waveAnims.forEach(a => a.setValue(6));
        }
    }, [voiceState]);

    // ── Reset ─────────────────────────────────────────────────────────────────
    const resetAll = () => {
        Speech.stop();
        clearSilenceTimers();
        setScreen(SCREEN.CAPTURE);
        setImageUri(null);
        setImageBase64(null);
        setDiagnosis(null);
        setIsSpeaking(false);
        setVoiceState(VOICE_STATE.IDLE);
        setChatHistory([]);
        setCurrentReply('');
        isProcessingRef.current = false;
    };

    // ── Image pick ────────────────────────────────────────────────────────────
    const pickImage = async (useCamera = false) => {
        try {
            let result;
            if (useCamera) {
                const perm = await ImagePicker.requestCameraPermissionsAsync();
                if (!perm.granted) { Alert.alert(t.permission, t.cameraAccessRequired); return; }
                result = await ImagePicker.launchCameraAsync({ mediaTypes: ['images'], allowsEditing: true, aspect: [4, 3], quality: 0.8 });
            } else {
                const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
                if (!perm.granted) { Alert.alert(t.permission, t.galleryAccessRequired); return; }
                result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], allowsEditing: true, aspect: [4, 3], quality: 0.8 });
            }
            if (!result.canceled && result.assets?.length > 0) {
                const uri = result.assets[0].uri;
                setImageUri(uri);
                await analyzeImage(uri);
            }
        } catch (e) {
            console.error('Image pick error:', e);
            Alert.alert(t.error, t.failedToPickImage);
        }
    };

    // ── Phase 1: Image Analysis ───────────────────────────────────────────────
    const analyzeImage = async (uri) => {
        setScreen(SCREEN.ANALYZING);
        try {
            const b64 = await FileSystem.readAsStringAsync(uri, { encoding: 'base64' });
            setImageBase64(b64);

            const cropPrompt = `You are FasalDoc, an expert agricultural AI doctor.
Analyze this crop leaf image for diseases, pests, or nutrient deficiencies.
Translate ALL values (except scientificName) into ${selectedLang.name}.
Return ONLY valid JSON — no markdown, no extra text:
{
  "diseaseName": "Disease name in ${selectedLang.name}",
  "scientificName": "Scientific name in English/Latin",
  "severityText": "e.g. High - 80% in ${selectedLang.name}",
  "severityColor": "#ef4444 for high | #f59e0b for medium | #10b981 for low/healthy",
  "severityPercentage": 0-100,
  "treatments": ["Step 1 in ${selectedLang.name}", "Step 2", "Step 3"],
  "ttsIntro": "A 2-sentence spoken summary in ${selectedLang.name} a farmer would understand"
}`;

            const reportPrompt = `You are FasalDoc, an expert agricultural AI advisor.
Analyze this Soil Health Card or Lab Report image.
Translate ALL values into ${selectedLang.name}.
Return ONLY valid JSON:
{
  "diseaseName": "Report summary title in ${selectedLang.name}",
  "scientificName": "Primary crop or General in ${selectedLang.name}",
  "severityText": "Overall soil status in ${selectedLang.name}",
  "severityColor": "#ef4444 for poor | #f59e0b for fair | #10b981 for good",
  "severityPercentage": 0-100,
  "treatments": ["Recommendation 1 in ${selectedLang.name}", "2", "3"],
  "ttsIntro": "A 2-sentence spoken summary in ${selectedLang.name} a farmer would understand"
}`;

            const body = {
                systemInstruction: { parts: [{ text: scanMode === 'CROP' ? cropPrompt : reportPrompt }] },
                contents: [{
                    role: 'user',
                    parts: [
                        { inlineData: { mimeType: 'image/jpeg', data: b64 } },
                        { text: 'Analyze and return JSON only.' },
                    ],
                }],
                generationConfig: {
                    temperature: 0.3,
                    maxOutputTokens: 600,
                    thinkingConfig: { thinkingBudget: 0 },
                    responseMimeType: 'application/json',
                },
            };

            const res = await fetch(VISION_URL, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
            if (!res.ok) throw new Error(`API ${res.status}: ${await res.text()}`);
            const data = await res.json();

            const raw = data?.candidates?.[0]?.content?.parts?.filter(p => p.text && !p.thought).map(p => p.text).join('').trim();
            if (!raw) throw new Error('No response from Gemini');

            const parsed = JSON.parse(raw);
            const result = {
                diseaseName: parsed.diseaseName || 'Unknown',
                scientificName: parsed.scientificName || '',
                severity: parsed.severityText || '',
                severityColor: parsed.severityColor || '#f59e0b',
                severityWidth: `${parsed.severityPercentage ?? 50}%`,
                treatments: parsed.treatments || [],
                ttsIntro: parsed.ttsIntro || '',
                ttsText: (parsed.treatments || []).join('. '),
            };
            setDiagnosis(result);

            // Seed chat history with the diagnosis as AI context
            setChatHistory([{
                role: 'ai',
                text: parsed.ttsIntro || result.diseaseName,
            }]);

            setScreen(SCREEN.RESULTS);

            // Auto-speak the TTS intro
            if (parsed.ttsIntro) {
                setIsSpeaking(true);
                Speech.speak(parsed.ttsIntro, {
                    language: selectedLang.tts,
                    pitch: 1.0,
                    rate: 0.9,
                    onDone: () => setIsSpeaking(false),
                    onError: () => setIsSpeaking(false),
                });
            }

            // Save
            try {
                await fasaldocService.saveReport({
                    type: scanMode, language: selectedLang.key,
                    diseaseName: result.diseaseName, scientificName: result.scientificName,
                    severity: result.severity, severityPercentage: parsed.severityPercentage || 50,
                    treatments: result.treatments, imageUri: uri,
                });
            } catch (dbErr) { console.warn('DB save failed:', dbErr); }

        } catch (e) {
            console.error('Analysis error:', e);
            Alert.alert(t.analysisFailed, t.analysisFailedMessage);
            setScreen(SCREEN.CAPTURE);
        }
    };

    // ── Phase 2+: Voice Q&A ───────────────────────────────────────────────────

    // Silence detection
    const handleRecordingStatus = (status) => {
        if (!status.isRecording || isProcessingRef.current) return;
        const elapsed = Date.now() - (recordStartRef.current || Date.now());
        if (elapsed < MIN_RECORD_MS) return;

        const db = typeof status.metering === 'number' ? status.metering : 0;
        const isSilent = db < SILENCE_THRESHOLD_DB;

        if (isSilent) {
            if (!silenceTimerRef.current) {
                silenceTimerRef.current = setTimeout(() => {
                    clearSilenceTimers();
                    stopAndAsk(true);
                }, SILENCE_DURATION_MS);

                let remaining = COUNTDOWN_STEPS;
                setSilenceCountdown(remaining);
                countdownIntervalRef.current = setInterval(() => {
                    remaining -= 1;
                    if (remaining <= 0) {
                        clearInterval(countdownIntervalRef.current);
                        countdownIntervalRef.current = null;
                        setSilenceCountdown(null);
                    } else { setSilenceCountdown(remaining); }
                }, 1000);
            }
        } else {
            clearSilenceTimers();
        }
    };

    const clearSilenceTimers = () => {
        if (silenceTimerRef.current) { clearTimeout(silenceTimerRef.current); silenceTimerRef.current = null; }
        if (countdownIntervalRef.current) { clearInterval(countdownIntervalRef.current); countdownIntervalRef.current = null; }
        setSilenceCountdown(null);
    };

    const startRecording = async () => {
        try {
            Speech.stop();
            setIsSpeaking(false);
            const { status } = await Audio.requestPermissionsAsync();
            if (status !== 'granted') { Alert.alert(t.permission, t.microphoneAccessRequired); return; }
            await Audio.setAudioModeAsync({ allowsRecordingIOS: true, playsInSilentModeIOS: true });

            const rec = new Audio.Recording();
            await rec.prepareToRecordAsync({
                isMeteringEnabled: true,
                android: { extension: '.m4a', outputFormat: Audio.AndroidOutputFormat.MPEG_4, audioEncoder: Audio.AndroidAudioEncoder.AAC, sampleRate: 16000, numberOfChannels: 1, bitRate: 64000 },
                ios: { extension: '.m4a', outputFormat: Audio.IOSOutputFormat.MPEG4AAC, audioQuality: Audio.IOSAudioQuality.MEDIUM, sampleRate: 16000, numberOfChannels: 1, bitRate: 64000 },
                web: {},
            });
            rec.setOnRecordingStatusUpdate(handleRecordingStatus);
            await rec.startAsync();

            recordingRef.current = rec;
            recordStartRef.current = Date.now();
            isProcessingRef.current = false;
            setVoiceState(VOICE_STATE.RECORDING);
            setCurrentReply('');
        } catch (e) {
            console.error('Start recording error:', e);
        }
    };

    const stopAndAsk = async () => {
        if (!recordingRef.current || isProcessingRef.current) return;
        isProcessingRef.current = true;
        clearSilenceTimers();
        setVoiceState(VOICE_STATE.PROCESSING);

        try {
            await recordingRef.current.stopAndUnloadAsync();
            const uri = recordingRef.current.getURI();
            recordingRef.current = null;
            await Audio.setAudioModeAsync({ allowsRecordingIOS: false });
            if (!uri) throw new Error('No URI');

            const audioB64 = await FileSystem.readAsStringAsync(uri, { encoding: 'base64' });
            await FileSystem.deleteAsync(uri, { idempotent: true }).catch(() => { });
            await callVoiceQA(audioB64);
        } catch (e) {
            console.error('stopAndAsk error:', e);
            setVoiceState(VOICE_STATE.IDLE);
            isProcessingRef.current = false;
        }
    };

    const callVoiceQA = async (audioB64) => {
        try {
            // Build system prompt with full diagnosis context
            const diagContext = diagnosis
                ? `Diagnosis: ${diagnosis.diseaseName} (${diagnosis.scientificName}). Severity: ${diagnosis.severity}. Treatments: ${diagnosis.treatments.join('; ')}.`
                : '';

            const systemPrompt = `You are FasalDoc, an expert agricultural AI doctor for Indian farmers.
Context of the crop scan already done: ${diagContext}
The farmer is now asking a follow-up question about this diagnosis.
Rules:
- Reply ONLY in ${selectedLang.name} (${selectedLang.label}).
- 2–4 natural spoken sentences only. No bullet points, no markdown.
- Warm, simple, farmer-friendly tone.
- If you cannot understand the audio, ask the farmer to repeat in ${selectedLang.name}.`;

            // Build conversation history for multi-turn context
            const historyParts = chatHistory.slice(-6).map(msg => ({
                role: msg.role === 'ai' ? 'model' : 'user',
                parts: [{ text: msg.text }],
            }));

            const body = {
                systemInstruction: { parts: [{ text: systemPrompt }] },
                contents: [
                    ...historyParts,
                    {
                        role: 'user',
                        parts: [
                            { inlineData: { mimeType: 'audio/m4a', data: audioB64 } },
                            { text: `Transcribe what the farmer asked and answer in ${selectedLang.name} only. Plain spoken sentences.` },
                        ],
                    },
                ],
                generationConfig: {
                    temperature: 0.7,
                    maxOutputTokens: 350,
                    thinkingConfig: { thinkingBudget: 0 },
                },
            };

            const res = await fetch(VOICE_URL, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
            if (!res.ok) throw new Error(`API ${res.status}`);
            const data = await res.json();

            const parts = data?.candidates?.[0]?.content?.parts ?? [];
            const reply = parts.filter(p => p.text && !p.thought).map(p => p.text.trim()).join(' ').trim()
                || FALLBACKS[selectedLang.key] || FALLBACKS.default;

            setCurrentReply(reply);
            setChatHistory(prev => [...prev.slice(-8), { role: 'user', text: '🎤 ...' }, { role: 'ai', text: reply }]);

            // Speak the reply
            setVoiceState(VOICE_STATE.SPEAKING);
            isProcessingRef.current = false;
            Speech.speak(reply, {
                language: selectedLang.tts,
                pitch: 1.0,
                rate: 0.9,
                onDone: () => setVoiceState(VOICE_STATE.IDLE),
                onError: () => setVoiceState(VOICE_STATE.IDLE),
            });
        } catch (e) {
            console.error('Voice QA error:', e);
            const fallback = FALLBACKS[selectedLang.key] || FALLBACKS.default;
            setCurrentReply(fallback);
            setVoiceState(VOICE_STATE.SPEAKING);
            isProcessingRef.current = false;
            Speech.speak(fallback, {
                language: selectedLang.tts,
                onDone: () => setVoiceState(VOICE_STATE.IDLE),
                onError: () => setVoiceState(VOICE_STATE.IDLE),
            });
        }
    };

    const handleMicPress = () => {
        if (voiceState === VOICE_STATE.IDLE) startRecording();
        else if (voiceState === VOICE_STATE.RECORDING) stopAndAsk();
        else if (voiceState === VOICE_STATE.SPEAKING) { Speech.stop(); setVoiceState(VOICE_STATE.IDLE); }
    };

    const toggleResultSpeech = () => {
        if (isSpeaking) {
            Speech.stop();
            setIsSpeaking(false);
        } else if (diagnosis?.ttsIntro) {
            setIsSpeaking(true);
            Speech.speak(diagnosis.ttsIntro + '. ' + diagnosis.ttsText, {
                language: selectedLang.tts,
                pitch: 1.0,
                rate: 0.9,
                onDone: () => setIsSpeaking(false),
                onError: () => setIsSpeaking(false),
            });
        }
    };

    // ── Mic button color ──────────────────────────────────────────────────────
    const getMicColor = () => {
        switch (voiceState) {
            case VOICE_STATE.RECORDING: return silenceCountdown !== null ? '#f97316' : '#ef4444';
            case VOICE_STATE.PROCESSING: return '#f59e0b';
            case VOICE_STATE.SPEAKING: return '#3b82f6';
            default: return '#16a34a';
        }
    };

    const getMicIcon = () => {
        if (voiceState === VOICE_STATE.PROCESSING) return 'ellipsis-horizontal';
        if (voiceState === VOICE_STATE.SPEAKING) return 'volume-high';
        return 'mic';
    };

    const getMicLabel = () => {
        if (voiceState === VOICE_STATE.RECORDING) return t.listening;
        if (voiceState === VOICE_STATE.PROCESSING) return t.thinking;
        if (voiceState === VOICE_STATE.SPEAKING) return t.stopSpeak;
        return t.tapToAsk;
    };

    // ── Renders ───────────────────────────────────────────────────────────────
    const renderCapture = () => (
        <View style={styles.contentWrapper}>
            <View style={styles.toggleRow}>
                {['CROP', 'REPORT'].map(mode => (
                    <TouchableOpacity
                        key={mode}
                        style={[styles.toggleBtn, scanMode === mode && styles.toggleBtnActive]}
                        onPress={() => setScanMode(mode)}
                    >
                        <MaterialCommunityIcons
                            name={mode === 'CROP' ? 'leaf' : 'file-document-outline'}
                            size={16}
                            color={scanMode === mode ? '#fff' : '#64748b'}
                        />
                        <Text style={[styles.toggleBtnText, scanMode === mode && styles.toggleBtnTextActive]}>
                            {mode === 'CROP' ? t.toggleCrop : t.toggleReport}
                        </Text>
                    </TouchableOpacity>
                ))}
            </View>

            <View style={styles.captureCard}>
                <View style={styles.dashedBox}>
                    <MaterialCommunityIcons name={scanMode === 'CROP' ? 'camera-outline' : 'magnify-scan'} size={52} color="#94a3b8" />
                    <Text style={styles.captureMainText}>{scanMode === 'CROP' ? t.captureCropMain : t.captureReportMain}</Text>
                    <Text style={styles.captureSubText}>{scanMode === 'CROP' ? t.captureCropSub : t.captureReportSub}</Text>
                    <View style={styles.captureActionRow}>
                        <TouchableOpacity style={styles.galleryBtn} onPress={() => pickImage(false)}>
                            <Ionicons name="images-outline" size={20} color="#64748b" />
                            <Text style={styles.galleryBtnText}>{t.gallery}</Text>
                        </TouchableOpacity>
                        <TouchableOpacity style={styles.cameraBtn} onPress={() => pickImage(true)}>
                            <Ionicons name="camera-outline" size={20} color="#fff" />
                            <Text style={styles.cameraBtnText}>{t.camera}</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </View>

            <View style={styles.tipsCard}>
                <Text style={styles.tipsTitle}>{t.tipsTitle}</Text>
                {[t.tip1, t.tip2, t.tip3].map((tip, i) => (
                    <View key={i} style={styles.tipItem}>
                        <View style={styles.tipDot} />
                        <Text style={styles.tipText}>{tip}</Text>
                    </View>
                ))}
            </View>

            <View style={styles.langSection}>
                <Text style={styles.langSectionLabel}>{t.langTitle}</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.langScroll}>
                    {LANGUAGES.map(lang => {
                        const isActive = selectedLang.key === lang.key;
                        return (
                            <TouchableOpacity
                                key={lang.key}
                                style={[styles.langChip, isActive && styles.langChipActive]}
                                onPress={() => setSelectedLang(lang)}
                            >
                                <Text style={[styles.langChipText, isActive && styles.langChipTextActive]}>{lang.label}</Text>
                            </TouchableOpacity>
                        );
                    })}
                </ScrollView>
            </View>
        </View>
    );

    const renderAnalyzing = () => (
        <View style={styles.analyzeCenter}>
            {imageUri && <Image source={{ uri: imageUri }} style={styles.analyzeImage} />}
            <View style={styles.analyzeSpinner}>
                <ActivityIndicator size="large" color="#16a34a" />
            </View>
            <Text style={styles.analyzingText}>{t.analyzing}</Text>
        </View>
    );

    const renderDiagnosisCard = () => {
        if (!diagnosis) return null;
        return (
            <View style={styles.diagnosisCard}>
                <View style={styles.diagnosisHeader}>
                    <View style={[styles.diseaseIconBox, { backgroundColor: diagnosis.severityColor + '22' }]}>
                        <MaterialCommunityIcons name="virus-outline" size={24} color={diagnosis.severityColor} />
                    </View>
                    <View style={{ flex: 1 }}>
                        <Text style={styles.diseaseName}>{diagnosis.diseaseName}</Text>
                        {!!diagnosis.scientificName && (
                            <Text style={styles.diseaseScientific}>{diagnosis.scientificName}</Text>
                        )}
                    </View>
                </View>

                <View style={styles.severitySection}>
                    <View style={styles.severityLabelRow}>
                        <Text style={styles.severityLabel}>{t.severity}</Text>
                        <View style={[styles.severityBadge, { backgroundColor: diagnosis.severityColor + '18' }]}>
                            <Text style={[styles.severityBadgeText, { color: diagnosis.severityColor }]}>{diagnosis.severity}</Text>
                        </View>
                    </View>
                    <View style={styles.severityBarBg}>
                        <View style={[styles.severityBarFill, { width: diagnosis.severityWidth, backgroundColor: diagnosis.severityColor }]} />
                    </View>
                </View>

                <Text style={styles.treatmentTitle}>{t.treatment}</Text>
                {diagnosis.treatments.map((t, i) => (
                    <View key={i} style={styles.treatmentItem}>
                        <View style={styles.checkDot} />
                        <Text style={styles.treatmentText}>{t}</Text>
                    </View>
                ))}

                {/* Listen / Stop button */}
                <TouchableOpacity
                    style={[styles.listenBtn, isSpeaking && styles.listenBtnActive]}
                    onPress={toggleResultSpeech}
                >
                    <Ionicons name={isSpeaking ? 'stop' : 'volume-high'} size={18} color="#fff" />
                    <Text style={styles.listenBtnText}>{isSpeaking ? t.stopSpeak : t.listen}</Text>
                </TouchableOpacity>
            </View>
        );
    };

    const renderVoicePanel = () => (
        <View style={styles.voicePanel}>
            <Text style={styles.chatTitle}>{t.chatTitle}</Text>

            {/* Current reply bubble */}
            {!!currentReply && (
                <View style={styles.replyBubble}>
                    <Ionicons name="leaf" size={13} color="#16a34a" />
                    <Text style={styles.replyText}>{currentReply}</Text>
                </View>
            )}

            {/* Silence countdown */}
            {voiceState === VOICE_STATE.RECORDING && silenceCountdown !== null && (
                <View style={styles.countdownBadge}>
                    <Text style={styles.countdownNum}>{silenceCountdown}</Text>
                    <Text style={styles.countdownSub}>s</Text>
                </View>
            )}

            {/* Waveform */}
            <View style={styles.waveRow}>
                {waveAnims.map((anim, i) => (
                    <Animated.View
                        key={i}
                        style={[styles.waveBar, {
                            height: anim,
                            backgroundColor: getMicColor(),
                            opacity: voiceState !== VOICE_STATE.IDLE ? 1 : 0.25,
                        }]}
                    />
                ))}
            </View>

            {/* Mic button */}
            <TouchableOpacity
                onPress={handleMicPress}
                disabled={voiceState === VOICE_STATE.PROCESSING}
                activeOpacity={0.85}
                style={styles.micOuter}
            >
                <Animated.View style={[
                    styles.micInner,
                    { backgroundColor: getMicColor(), shadowColor: getMicColor() },
                    { transform: [{ scale: pulseAnim }] },
                ]}>
                    <Ionicons name={getMicIcon()} size={36} color="#fff" />
                </Animated.View>
            </TouchableOpacity>
            <Text style={styles.micLabel}>{getMicLabel()}</Text>
        </View>
    );

    const renderResults = () => (
        <View style={styles.contentWrapper}>
            {/* Hero image */}
            {imageUri && (
                <View style={styles.heroCard}>
                    <Image source={{ uri: imageUri }} style={styles.heroImage} />
                    <View style={styles.heroOverlay}>
                        <MaterialCommunityIcons name="check-decagram" size={28} color="#4ade80" />
                    </View>
                </View>
            )}

            {renderDiagnosisCard()}
            {renderVoicePanel()}

            {/* New scan button */}
            <TouchableOpacity style={styles.newScanBtn} onPress={resetAll}>
                <Ionicons name="refresh" size={18} color="#1a2e0a" />
                <Text style={styles.newScanText}>{t.newScan}</Text>
            </TouchableOpacity>
        </View>
    );

    const handleBack = () => {
        if (screen !== SCREEN.CAPTURE) { resetAll(); }
        else { navigation.goBack(); }
    };

    // ── Main render ───────────────────────────────────────────────────────────
    return (
        <SafeAreaView style={styles.safe}>
            <StatusBar barStyle="dark-content" backgroundColor="#faf7f1" />
            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
                <View style={styles.header}>
                    <Text style={styles.headerTitle}>{t.diagnosisTitle}</Text>
                    <TouchableOpacity style={styles.closeBtn} onPress={() => navigation.goBack()}>
                        <Ionicons name="close" size={24} color="#1a2e0a" />
                    </TouchableOpacity>
                </View>

                {/* Scan Instruction */}
                <View style={styles.instructionBox}>
                    <Text style={styles.instructionText}>
                        {t.scanInstructions}
                    </Text>
                </View>

                {screen === SCREEN.CAPTURE && renderCapture()}
                {screen === SCREEN.ANALYZING && renderAnalyzing()}
                {screen === SCREEN.RESULTS && renderResults()}
            </ScrollView>
        </SafeAreaView>
    );
}

// ── Styles ────────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
    safe: { flex: 1, backgroundColor: '#faf7f1' },
    scrollContent: { paddingBottom: 50 },
    contentWrapper: { paddingHorizontal: 14 },

    // Header
    headerRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 14, paddingVertical: 14 },
    backBtn: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
    titleColumn: { alignItems: 'center' },
    headerTitle: { fontSize: 22, fontFamily: 'PlayfairDisplay_700Bold', color: '#1a2e0a' },
    headerSubtitle: { fontSize: 12, color: '#64748b', fontFamily: 'NotoSansDevanagari_400Regular', marginTop: 2 },

    // Toggle
    toggleRow: { flexDirection: 'row', backgroundColor: '#e2e8f0', borderRadius: 20, padding: 4, marginBottom: 20 },
    toggleBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 10, borderRadius: 16, gap: 6 },
    toggleBtnActive: { backgroundColor: '#1a2e0a' },
    toggleBtnText: { fontSize: 13, fontFamily: 'NotoSansDevanagari_600SemiBold', color: '#64748b' },
    toggleBtnTextActive: { color: '#fff' },

    // Capture
    captureCard: { backgroundColor: '#fff', borderRadius: 24, padding: 16, borderWidth: 1.3, borderColor: '#e2e8f0', marginBottom: 20 },
    dashedBox: { borderRadius: 16, borderWidth: 1.3, borderColor: '#cbd5e1', borderStyle: 'dashed', paddingVertical: 40, paddingHorizontal: 20, alignItems: 'center' },
    captureMainText: { fontSize: 19, fontFamily: 'NotoSansDevanagari_700Bold', color: '#1a2e0a', marginTop: 18, textAlign: 'center' },
    captureSubText: { fontSize: 13, color: '#64748b', fontFamily: 'NotoSansDevanagari_400Regular', textAlign: 'center', marginTop: 8, marginBottom: 28 },
    captureActionRow: { flexDirection: 'row', gap: 12, width: '100%' },
    galleryBtn: { flex: 1, flexDirection: 'row', height: 52, backgroundColor: '#f1f5f9', borderRadius: 14, alignItems: 'center', justifyContent: 'center', gap: 8, borderWidth: 1, borderColor: '#e2e8f0' },
    galleryBtnText: { fontSize: 15, fontFamily: 'NotoSansDevanagari_600SemiBold', color: '#1e293b' },
    cameraBtn: { flex: 1, flexDirection: 'row', height: 52, backgroundColor: '#1a2e0a', borderRadius: 14, alignItems: 'center', justifyContent: 'center', gap: 8 },
    cameraBtnText: { fontSize: 15, fontFamily: 'NotoSansDevanagari_600SemiBold', color: '#fff' },

    // Tips
    tipsCard: { backgroundColor: '#fff', borderRadius: 20, padding: 22, borderWidth: 1.3, borderColor: '#e2e8f0', marginBottom: 20 },
    tipsTitle: { fontSize: 15, fontFamily: 'NotoSansDevanagari_700Bold', color: '#16a34a', marginBottom: 14 },
    tipItem: { flexDirection: 'row', alignItems: 'center', marginBottom: 10 },
    tipDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: '#16a34a', marginRight: 10 },
    tipText: { fontSize: 14, color: '#1a2e0a', fontFamily: 'NotoSansDevanagari_500Medium' },

    // Language
    langSection: { paddingBottom: 10, marginTop: 4 },
    langSectionLabel: { paddingHorizontal: 8, fontSize: 11, color: '#94a3b8', fontFamily: 'DMSans_500Medium', marginBottom: 10, letterSpacing: 0.5, textTransform: 'uppercase' },
    langScroll: { paddingHorizontal: 4 },
    langChip: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 14, paddingVertical: 8, borderRadius: 22, backgroundColor: '#f1f5f9', marginHorizontal: 4, borderWidth: 1, borderColor: '#e2e8f0' },
    langChipActive: { backgroundColor: '#16a34a', borderColor: '#16a34a' },
    langChipText: { color: '#64748b', fontSize: 13, fontFamily: 'NotoSansDevanagari_400Regular' },
    langChipTextActive: { color: '#fff', fontFamily: 'NotoSansDevanagari_600SemiBold' },

    // Analyzing
    analyzeCenter: { alignItems: 'center', justifyContent: 'center', paddingVertical: 60 },
    analyzeImage: { width: 160, height: 160, borderRadius: 20, opacity: 0.55, marginBottom: 24 },
    analyzeSpinner: { marginBottom: 16 },
    analyzingText: { fontSize: 17, fontFamily: 'NotoSansDevanagari_600SemiBold', color: '#1a2e0a' },

    // Hero
    heroCard: { borderRadius: 24, overflow: 'hidden', height: 200, marginBottom: 18, position: 'relative' },
    heroImage: { width: '100%', height: '100%', resizeMode: 'cover' },
    heroOverlay: { position: 'absolute', bottom: 14, right: 14, backgroundColor: 'rgba(0,0,0,0.45)', borderRadius: 20, padding: 6 },

    // Diagnosis card
    diagnosisCard: { backgroundColor: '#fff', borderRadius: 24, padding: 22, borderWidth: 1.3, borderColor: '#e2e8f0', marginBottom: 20 },
    diagnosisHeader: { flexDirection: 'row', alignItems: 'center', gap: 14, marginBottom: 20 },
    diseaseIconBox: { width: 48, height: 48, borderRadius: 24, alignItems: 'center', justifyContent: 'center' },
    diseaseName: { fontSize: 19, fontFamily: 'NotoSansDevanagari_700Bold', color: '#1a2e0a' },
    diseaseScientific: { fontSize: 11, color: '#64748b', fontStyle: 'italic', marginTop: 2, fontFamily: 'DMSans_400Regular' },
    severitySection: { marginBottom: 20 },
    severityLabelRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
    severityLabel: { fontSize: 13, color: '#64748b', fontFamily: 'NotoSansDevanagari_500Medium' },
    severityBadge: { paddingHorizontal: 12, paddingVertical: 4, borderRadius: 8 },
    severityBadgeText: { fontSize: 12, fontFamily: 'NotoSansDevanagari_700Bold' },
    severityBarBg: { height: 8, backgroundColor: '#f1f5f9', borderRadius: 4, overflow: 'hidden' },
    severityBarFill: { height: '100%', borderRadius: 4 },
    treatmentTitle: { fontSize: 14, fontFamily: 'NotoSansDevanagari_700Bold', color: '#ea580c', marginBottom: 10 },
    treatmentItem: { flexDirection: 'row', alignItems: 'flex-start', gap: 10, marginBottom: 8 },
    checkDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: '#16a34a', marginTop: 6 },
    treatmentText: { flex: 1, fontSize: 14, color: '#1e293b', fontFamily: 'NotoSansDevanagari_400Regular', lineHeight: 20 },
    listenBtn: { flexDirection: 'row', alignItems: 'center', alignSelf: 'flex-start', backgroundColor: '#1a2e0a', paddingHorizontal: 18, paddingVertical: 10, borderRadius: 22, gap: 8, marginTop: 16 },
    listenBtnActive: { backgroundColor: '#ef4444' },
    listenBtnText: { color: '#fff', fontSize: 14, fontFamily: 'NotoSansDevanagari_600SemiBold' },

    // Voice panel
    voicePanel: { backgroundColor: '#0f1f07', borderRadius: 28, padding: 24, marginBottom: 20, alignItems: 'center' },
    chatTitle: { fontSize: 14, color: 'rgba(255,255,255,0.5)', fontFamily: 'DMSans_500Medium', letterSpacing: 0.5, textTransform: 'uppercase', marginBottom: 14 },
    replyBubble: { flexDirection: 'row', alignItems: 'flex-start', gap: 8, backgroundColor: 'rgba(255,255,255,0.08)', borderRadius: 16, padding: 14, marginBottom: 16, width: '100%', borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)' },
    replyText: { flex: 1, fontSize: 14, color: '#fff', fontFamily: 'NotoSansDevanagari_400Regular', lineHeight: 22 },
    countdownBadge: { flexDirection: 'row', alignItems: 'baseline', gap: 2, backgroundColor: 'rgba(249,115,22,0.2)', borderRadius: 16, paddingHorizontal: 14, paddingVertical: 6, marginBottom: 10, borderWidth: 1, borderColor: 'rgba(249,115,22,0.4)' },
    countdownNum: { fontSize: 22, color: '#f97316', fontFamily: 'PlayfairDisplay_700Bold' },
    countdownSub: { fontSize: 13, color: '#f97316', fontFamily: 'DMSans_500Medium' },
    waveRow: { flexDirection: 'row', alignItems: 'center', height: 52, gap: 5, marginBottom: 22 },
    waveBar: { width: 4, borderRadius: 2 },
    micOuter: { width: 110, height: 110, borderRadius: 55, backgroundColor: 'rgba(255,255,255,0.05)', alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)', marginBottom: 12 },
    micInner: { width: 80, height: 80, borderRadius: 40, alignItems: 'center', justifyContent: 'center', elevation: 12, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.5, shadowRadius: 16 },
    micLabel: { fontSize: 13, color: 'rgba(255,255,255,0.45)', fontFamily: 'DMSans_400Regular' },

    // New scan
    newScanBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: '#f1f5f9', borderRadius: 22, paddingVertical: 14, marginTop: 4, borderWidth: 1, borderColor: '#e2e8f0' },
    newScanText: { fontSize: 15, fontFamily: 'NotoSansDevanagari_600SemiBold', color: '#1a2e0a' },
});