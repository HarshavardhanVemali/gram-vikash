import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
    View,
    StyleSheet,
    Animated,
    TouchableOpacity,
    Platform,
    Text,
    Dimensions
} from 'react-native';
import * as Haptics from 'expo-haptics';
import MicIcon from './icons/MicIcon';
import { voiceService } from '../services/voiceService';

const { width } = Dimensions.get('window');

const STATES = {
    IDLE: 'IDLE',
    RECORDING: 'RECORDING',
    PROCESSING: 'PROCESSING',
    PLAYING: 'PLAYING',
    ERROR: 'ERROR'
};

export default function VoiceFAB({ navigationRef, currentRouteName }) {
    const [currentState, setCurrentState] = useState(STATES.IDLE);
    const [transcript, setTranscript] = useState('');
    const routeName = useMemo(() => currentRouteName ?? 'Unknown', [currentRouteName]);

    // Animations
    const scaleAnim = useRef(new Animated.Value(1)).current;
    const pulseAnim = useRef(new Animated.Value(0)).current;
    const toastOpacity = useRef(new Animated.Value(0)).current;

    // We will use 5 animated values for the audio waveform
    const waveformAnims = useRef(Array.from({ length: 5 }).map(() => new Animated.Value(0.1))).current;

    // 3 bouncing dots for processing
    const dotAnims = useRef(Array.from({ length: 3 }).map(() => new Animated.Value(0))).current;

    // 3 expanding arcs for playing
    const arcAnims = useRef(Array.from({ length: 3 }).map(() => new Animated.Value(0))).current;

    const recordingTimeout = useRef(null);

    useEffect(() => {
        let pulseLoop;
        if (currentState === STATES.IDLE) {
            pulseLoop = Animated.loop(
                Animated.sequence([
                    Animated.timing(scaleAnim, { toValue: 1.1, duration: 1000, useNativeDriver: true }),
                    Animated.timing(scaleAnim, { toValue: 1, duration: 1000, useNativeDriver: true })
                ])
            );
            pulseLoop.start();
        } else {
            scaleAnim.setValue(1);
        }

        return () => {
            if (pulseLoop) pulseLoop.stop();
        };
    }, [currentState]);

    // Processing Dots Animation
    useEffect(() => {
        let loops = [];
        if (currentState === STATES.PROCESSING) {
            dotAnims.forEach((anim, index) => {
                const loop = Animated.loop(
                    Animated.sequence([
                        Animated.timing(anim, { toValue: -8, duration: 300, delay: index * 150, useNativeDriver: true }),
                        Animated.timing(anim, { toValue: 0, duration: 300, useNativeDriver: true }),
                        Animated.delay(400)
                    ])
                );
                loop.start();
                loops.push(loop);
            });
        } else {
            dotAnims.forEach(anim => anim.setValue(0));
        }
        return () => loops.forEach(loop => loop.stop());
    }, [currentState]);

    // Playing Arcs Animation
    useEffect(() => {
        let loops = [];
        if (currentState === STATES.PLAYING) {
            arcAnims.forEach((anim, index) => {
                const loop = Animated.loop(
                    Animated.timing(anim, {
                        toValue: 1,
                        duration: 1500,
                        delay: index * 400,
                        useNativeDriver: true
                    })
                );
                loop.start();
                loops.push(loop);
            });
        } else {
            arcAnims.forEach(anim => anim.setValue(0));
        }
        return () => loops.forEach(loop => loop.stop());
    }, [currentState]);

    const showToast = (text) => {
        const limitedText = text.length > 55 ? text.substring(0, 52) + '...' : text;
        setTranscript(limitedText);
        Animated.sequence([
            Animated.timing(toastOpacity, { toValue: 1, duration: 200, useNativeDriver: true }),
            Animated.delay(3000),
            Animated.timing(toastOpacity, { toValue: 0, duration: 300, useNativeDriver: true })
        ]).start();
    };

    const triggerError = () => {
        setCurrentState(STATES.ERROR);
        if (Platform.OS !== 'web') Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
        Animated.sequence([
            Animated.timing(scaleAnim, { toValue: 0.9, duration: 100, useNativeDriver: true }),
            Animated.timing(scaleAnim, { toValue: 1.1, duration: 100, useNativeDriver: true }),
            Animated.timing(scaleAnim, { toValue: 1, duration: 100, useNativeDriver: true })
        ]).start(() => {
            setCurrentState(STATES.IDLE);
        });
    };

    const onPlaybackStatusUpdate = (status) => {
        if (status.isRecording && currentState === STATES.RECORDING) {
            // Simulated waveform logic based on metering
            // Real expo-av metering ranges from -160 to 0
            const metering = status.metering || -160;
            // Map -60 (quiet) to 0 (loud) -> 0.1 to 1.0
            const normalized = Math.max(0.1, Math.min(1.0, (metering + 60) / 60));

            // Randomly jiggle the bars based on base normalized volume
            waveformAnims.forEach((anim) => {
                const randomVol = normalized * (0.5 + Math.random() * 0.5);
                Animated.timing(anim, {
                    toValue: Math.max(0.1, randomVol),
                    duration: 100,
                    useNativeDriver: true
                }).start();
            });
        }
    };

    const handlePress = async () => {
        if (currentState === STATES.IDLE) {
            try {
                if (Platform.OS !== 'web') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                setCurrentState(STATES.RECORDING);

                await voiceService.startRecording(onPlaybackStatusUpdate);

                // Auto stop after 10s
                recordingTimeout.current = setTimeout(() => {
                    handlePress(); // triggers stop
                }, 10000);

            } catch (err) {
                console.error(err);
                triggerError();
            }
        } else if (currentState === STATES.RECORDING) {
            if (recordingTimeout.current) {
                clearTimeout(recordingTimeout.current);
                recordingTimeout.current = null;
            }
            if (Platform.OS !== 'web') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            setCurrentState(STATES.PROCESSING);

            try {
                const audioUri = await voiceService.stopRecording();
                if (!audioUri) throw new Error("No audio URI returned");

                const contextStr = JSON.stringify({ screen: routeName });
                const taskId = await voiceService.submitQuery(audioUri, contextStr);

                const result = await voiceService.pollResult(taskId);

                if (result.status === 'done') {
                    showToast(result.transcript);
                    setCurrentState(STATES.PLAYING);

                    // Navigate if intent matches
                    if (result.intent) {
                        const intentMap = {
                            'crops': 'Crops',
                            'weather': 'Weather',
                            'schemes': 'Schemes',
                            'market': 'Market'
                        };
                        const targetScreen = intentMap[result.intent];
                        if (targetScreen && routeName !== targetScreen && navigationRef?.isReady()) {
                            navigationRef.navigate(targetScreen);
                        }
                    }

                    if (result.audio_url) {
                        await voiceService.playAudio(result.audio_url);
                        // Back to idle after playing finishes
                    }
                    setCurrentState(STATES.IDLE);

                } else {
                    throw new Error("Task failed or error returned");
                }
            } catch (err) {
                console.error("AI flow error:", err);
                triggerError();
            }
        } else if (currentState === STATES.PLAYING) {
            // Allow user to cancel playing
            if (voiceService.sound) {
                await voiceService.sound.stopAsync();
            }
            setCurrentState(STATES.IDLE);
        }
    };

    const getFabStyle = () => {
        switch (currentState) {
            case STATES.RECORDING: return [styles.fab, styles.fabRecording];
            case STATES.PROCESSING: return [styles.fab, styles.fabProcessing];
            case STATES.PLAYING: return [styles.fab, styles.fabPlaying];
            case STATES.ERROR: return [styles.fab, styles.fabError];
            default: return [styles.fab, styles.fabIdle];
        }
    };

    return (
        <View style={styles.container} pointerEvents="box-none">

            {/* Transcript Toast */}
            <Animated.View style={[styles.toast, { opacity: toastOpacity }]}>
                <Text style={styles.toastText} numberOfLines={2}>{transcript}</Text>
            </Animated.View>

            <View style={styles.fabWrapper}>

                {/* Playing Arcs */}
                {currentState === STATES.PLAYING && arcAnims.map((anim, i) => (
                    <Animated.View
                        key={i}
                        style={[
                            styles.playingArc,
                            {
                                transform: [
                                    { scale: anim.interpolate({ inputRange: [0, 1], outputRange: [1, 2.5] }) }
                                ],
                                opacity: anim.interpolate({ inputRange: [0, 0.5, 1], outputRange: [0, 0.4, 0] })
                            }
                        ]}
                    />
                ))}

                <TouchableOpacity
                    activeOpacity={0.8}
                    onPress={handlePress}
                >
                    <Animated.View style={[getFabStyle(), { transform: [{ scale: scaleAnim }] }]}>

                        {currentState === STATES.IDLE && (
                            <MicIcon size={28} color="#fff" />
                        )}

                        {currentState === STATES.RECORDING && (
                            <View style={styles.waveformContainer}>
                                {waveformAnims.map((anim, i) => (
                                    <Animated.View
                                        key={i}
                                        style={[
                                            styles.waveformBar,
                                            { transform: [{ scaleY: anim }] }
                                        ]}
                                    />
                                ))}
                            </View>
                        )}

                        {currentState === STATES.PROCESSING && (
                            <View style={styles.dotsContainer}>
                                {dotAnims.map((anim, i) => (
                                    <Animated.View key={i} style={[styles.dot, { transform: [{ translateY: anim }] }]} />
                                ))}
                            </View>
                        )}

                        {currentState === STATES.PLAYING && (
                            <View style={styles.playingCenter}>
                                <MicIcon size={24} color="#fff" />
                            </View>
                        )}

                    </Animated.View>
                </TouchableOpacity>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        position: 'absolute',
        bottom: Platform.OS === 'ios' ? 90 : 70, // Above bottom tabs
        left: 0,
        right: 0,
        alignItems: 'center',
        zIndex: 9999,
    },
    toast: {
        backgroundColor: '#fff',
        paddingHorizontal: 20,
        paddingVertical: 12,
        borderRadius: 24,
        marginBottom: 16,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.15,
        shadowRadius: 12,
        elevation: 6,
        maxWidth: width * 0.8,
    },
    toastText: {
        fontFamily: 'DMSans_500Medium',
        fontSize: 14,
        color: '#1a2e0a',
        textAlign: 'center',
    },
    fabWrapper: {
        width: 80,
        height: 80,
        alignItems: 'center',
        justifyContent: 'center',
    },
    fab: {
        alignItems: 'center',
        justifyContent: 'center',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 6 },
        shadowOpacity: 0.3,
        shadowRadius: 10,
        elevation: 8,
    },
    fabIdle: {
        width: 64, height: 64, borderRadius: 32,
        backgroundColor: '#5a9c28', // Green
    },
    fabRecording: {
        width: 72, height: 72, borderRadius: 36,
        backgroundColor: '#e63946', // Red
    },
    fabProcessing: {
        width: 64, height: 64, borderRadius: 32,
        backgroundColor: '#f4a261', // Amber
    },
    fabPlaying: {
        width: 64, height: 64, borderRadius: 32,
        backgroundColor: '#2a9d8f', // Teal
    },
    fabError: {
        width: 64, height: 64, borderRadius: 32,
        backgroundColor: '#d62828', // Error Red
    },
    // Waveform
    waveformContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 4,
        height: 32,
    },
    waveformBar: {
        width: 4,
        height: 32,
        backgroundColor: '#fff',
        borderRadius: 2,
    },
    // Processing Dots
    dotsContainer: {
        flexDirection: 'row',
        gap: 6,
    },
    dot: {
        width: 8, height: 8,
        borderRadius: 4,
        backgroundColor: '#fff',
    },
    // Playing Arcs
    playingCenter: {
        width: 48, height: 48, borderRadius: 24,
        backgroundColor: 'rgba(255,255,255,0.2)',
        alignItems: 'center',
        justifyContent: 'center',
    },
    playingArc: {
        position: 'absolute',
        width: 64, height: 64, borderRadius: 32,
        borderWidth: 2,
        borderColor: '#2a9d8f',
    }
});
