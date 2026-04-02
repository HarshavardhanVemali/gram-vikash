import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ActivityIndicator, Image, Linking } from 'react-native';
import { COLORS } from '../colors';
import { API_KEYS } from '../constants/apiKeys';
import { Ionicons } from '@expo/vector-icons';
import { useFarmerStore } from '../store';

export default function DigiLockerWidget({ farmerId, onSuccess }) {
    // States: IDLE, LOADING, SUCCESS, ERROR
    const [status, setStatus] = useState('IDLE');
    const [errorMsg, setErrorMsg] = useState('');

    const farmer = useFarmerStore(state => state.farmer);
    const markLinked = useFarmerStore(state => state.markDigiLockerLinked);

    const handleDigiLockerConnect = async () => {
        setStatus('LOADING');
        try {
            // Fetch OAuth URL from Django
            const farmerId = farmer?.id || '1';
            console.log('DigiLocker: Fetching auth URL for farmer ID:', farmerId);
            const response = await fetch(`${API_KEYS.API_URL}/api/farmers/digilocker/auth-url/?farmer_id=${farmerId}`);
            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                console.log('DigiLocker Auth URL Status:', response.status);
                console.log('DigiLocker Auth URL Data:', errorData);
                throw new Error(errorData.error || `Failed to get auth URL (${response.status})`);
            }

            const data = await response.json();
            if (data.url) {
                // Open DigiLocker Sandbox in browser
                Linking.openURL(data.url);
            } else {
                throw new Error('No URL returned from backend');
            }
        } catch (e) {
            console.error('DigiLocker Connect Error:', e);
            setStatus('ERROR');
            setErrorMsg('Failed to connect to DigiLocker sandbox.');
        }
    };

    const checkStatus = async () => {
        try {
            const res = await fetch(`${API_KEYS.API_URL}/api/farmers/digilocker/status/?farmer_id=${farmer?.id}`);
            const data = await res.json();
            if (data.linked) {
                setStatus('SUCCESS');
                markLinked(data.verified_name);
                if (onSuccess) {
                    onSuccess({
                        name: data.verified_name,
                        village: data.village,
                        district: data.district,
                        state: data.state,
                        pincode: data.pincode,
                    });
                }
            }
        } catch (e) {
            console.error('Status check error:', e);
        }
    };

    useEffect(() => {
        // When component mounts or status is LOADING, check if linking was completed
        if (status === 'LOADING') {
            const interval = setInterval(checkStatus, 3000); // Poll every 3 seconds
            return () => clearInterval(interval);
        }
    }, [status]);

    if (farmer?.digilocker_linked || status === 'SUCCESS') {
        return (
            <View style={[styles.container, styles.successContainer]}>
                <View style={styles.iconCircleSuccess}>
                    <Ionicons name="checkmark" size={24} color={COLORS.CARD} />
                </View>
                <View style={styles.textBlock}>
                    <Text style={styles.successTitle}>DigiLocker Verified</Text>
                    <Text style={styles.successSubtitle}>✓ {farmer?.digilocker_aadhaar_name || "SURESH KUMAR"}</Text>
                </View>
            </View>
        );
    }

    return (
        <View style={styles.container}>
            <View style={styles.brandRow}>
                <Image
                    source={require('../../assets/DigiLocker.svg')}
                    style={styles.logo}
                    resizeMode="contain"
                />
            </View>
            <View style={styles.textBlockHero}>
                <Text style={styles.title}>Secure your profile</Text>
                <Text style={styles.subtitle}>Link DigiLocker (Aadhaar based KYC)</Text>
            </View>

            {status === 'ERROR' && <Text style={styles.errorText}>{errorMsg}</Text>}

            <TouchableOpacity
                style={styles.connectButton}
                onPress={handleDigiLockerConnect}
                disabled={status === 'LOADING'}
            >
                {status === 'LOADING' ? (
                    <ActivityIndicator color={COLORS.CARD} />
                ) : (
                    <Text style={styles.buttonText}>Connect with DigiLocker</Text>
                )}
            </TouchableOpacity>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        backgroundColor: '#fff',
        borderRadius: 20,
        padding: 24,
        borderWidth: 1,
        borderColor: '#ede8dc',
        marginBottom: 24,
        // Subtle shadow for premium feel
        shadowColor: '#1a2e0a',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.03,
        shadowRadius: 10,
    },
    successContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#f3f9ec',
        borderColor: '#d6e8c0',
    },
    brandRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 16,
    },
    logo: {
        width: 140,
        height: 36,
    },
    textBlockHero: {
        marginBottom: 20,
    },
    textBlock: {
        marginLeft: 16,
        flex: 1,
    },
    title: {
        fontFamily: 'DMSans_700Bold',
        fontSize: 18,
        color: '#1a2e0a',
    },
    subtitle: {
        fontFamily: 'DMSans_400Regular',
        fontSize: 13,
        color: '#6b7c5a',
        marginTop: 4,
    },
    connectButton: {
        backgroundColor: '#0056B3', // DigiLocker Blue
        height: 52,
        borderRadius: 14,
        justifyContent: 'center',
        alignItems: 'center',
    },
    buttonText: {
        color: '#fff',
        fontSize: 15,
        fontFamily: 'DMSans_600SemiBold',
    },
    iconCircleSuccess: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: COLORS.PRIMARY,
        justifyContent: 'center',
        alignItems: 'center',
    },
    successTitle: {
        fontSize: 16,
        fontWeight: 'bold',
        color: COLORS.PRIMARY,
    },
    successSubtitle: {
        fontSize: 14,
        color: COLORS.TEXT,
        marginTop: 4,
    },
    errorText: {
        color: COLORS.DANGER,
        marginBottom: 10,
        fontSize: 12,
    }
});
