import React from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    ScrollView,
    StatusBar,
    Dimensions,
    Linking
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { useBackHandler } from '../hooks/useBackHandler';
import { useFarmerStore } from '../store';
import { getUI } from '../utils/translations';

const { width } = Dimensions.get('window');

export default function EmergencyScreen() {
    const navigation = useNavigation();
    const { language } = useFarmerStore();
    const t = getUI(language);

    useBackHandler(() => {
        navigation.navigate('MainTabs', { screen: 'Home' });
        return true;
    });

    const emergencyServices = [
        {
            id: 'ambulance',
            name: t.ambulanceLabel,
            number: '108',
            icon: 'ambulance',
            iconFamily: 'MaterialCommunityIcons',
            bgColor: '#fff1f2',
            iconColor: '#e11d48',
        },
        {
            id: 'police',
            name: t.policeLabel,
            number: '112',
            icon: 'shield-alert',
            iconFamily: 'MaterialCommunityIcons',
            bgColor: '#eff6ff',
            iconColor: '#2563eb',
        },
        {
            id: 'krishi',
            name: t.krishiLabel,
            number: '1800-180-1551',
            icon: 'leaf',
            iconFamily: 'MaterialCommunityIcons',
            bgColor: '#f0fdf4',
            iconColor: '#16a34a',
        },
        {
            id: 'fire',
            name: t.fireLabel,
            number: '101',
            icon: 'fire',
            iconFamily: 'MaterialCommunityIcons',
            bgColor: '#fffbeb',
            iconColor: '#d97706',
        },
    ];

    const handleCall = (number) => {
        Linking.openURL(`tel:${number}`);
    };

    return (
        <SafeAreaView style={styles.safe}>
            <StatusBar barStyle="dark-content" backgroundColor="#faf7f1" />

            <ScrollView
                style={styles.container}
                contentContainerStyle={styles.scrollContent}
                showsVerticalScrollIndicator={false}
            >
                {/* Header matching Crops/Schemes page header */}
                <View style={styles.headerRow}>
                    <Text style={styles.screenTitle}>{t.aapdaTitle}</Text>
                    <TouchableOpacity style={styles.infoBtn}>
                        <Ionicons name="information-circle-outline" size={24} color="#6b7280" />
                    </TouchableOpacity>
                </View>

                {/* Subtitle / Description */}
                <View style={styles.heroSection}>
                    <View style={styles.emergencyIconBox}>
                        <MaterialCommunityIcons name="alert-decagram" size={32} color="#1a2e0a" />
                    </View>
                    <Text style={styles.heroTitle}>{t.emergencyHelp}</Text>
                    <Text style={styles.heroSubtitle}>{t.emergencySub}</Text>
                </View>

                {/* Emergency Grid Tiles */}
                <View style={styles.grid}>
                    {emergencyServices.map((service) => (
                        <TouchableOpacity
                            key={service.id}
                            style={styles.tile}
                            onPress={() => handleCall(service.number)}
                            activeOpacity={0.7}
                        >
                            <View style={[styles.tileIconBox, { backgroundColor: service.bgColor }]}>
                                <MaterialCommunityIcons
                                    name={service.icon}
                                    size={28}
                                    color={service.iconColor}
                                />
                            </View>
                            <Text style={styles.tileHindiName}>{service.name}</Text>
                            <View style={styles.numberBadge}>
                                <Text style={[styles.numberText, { color: service.iconColor }]}>{service.number}</Text>
                            </View>
                        </TouchableOpacity>
                    ))}
                </View>

                {/* Info Card */}
                <View style={styles.infoCard}>
                    <View style={styles.infoCardHeader}>
                        <Ionicons name="wifi-outline" size={20} color="#16a34a" />
                        <Text style={styles.infoCardTitle}>{t.offlineReady}</Text>
                    </View>
                    <Text style={styles.infoCardText}>
                        {t.offlineText}
                    </Text>
                </View>

                <View style={styles.footerSpacing} />
            </ScrollView>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    safe: {
        flex: 1,
        backgroundColor: '#faf7f1',
        paddingTop: 40,
    },
    container: {
        flex: 1,
    },
    scrollContent: {
        paddingHorizontal: 14, // Matches CropsScreen preference
        paddingBottom: 100,
    },
    headerRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingBottom: 20,
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
        marginVertical: 20,
    },
    emergencyIconBox: {
        width: 64,
        height: 64,
        borderRadius: 32,
        backgroundColor: '#fff',
        borderWidth: 1.5,
        borderColor: '#e2e8f0',
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 12,
        elevation: 2,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 8,
    },
    heroTitle: {
        fontSize: 24,
        fontFamily: 'NotoSansDevanagari_700Bold',
        color: '#1a2e0a',
    },
    heroSubtitle: {
        fontSize: 13,
        color: '#64748b',
        fontFamily: 'DMSans_500Medium',
        marginTop: 4,
    },
    grid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 12,
        justifyContent: 'space-between',
        marginTop: 10,
    },
    tile: {
        width: (width - 28 - 12) / 2, // 2 columns with 14px horizontal padding and 12px gap
        backgroundColor: '#ffffff',
        borderRadius: 20, // Medium radius consistent with Crops nutrients
        padding: 20,
        alignItems: 'center',
        borderWidth: 1.3,
        borderColor: '#e2e8f0',
        marginBottom: 4,
    },
    tileIconBox: {
        width: 56,
        height: 56,
        borderRadius: 16,
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 12,
    },
    tileHindiName: {
        fontSize: 16,
        fontFamily: 'NotoSansDevanagari_600SemiBold',
        color: '#1a2e0a',
        textAlign: 'center',
    },
    tileName: {
        fontSize: 11,
        fontFamily: 'DMSans_500Medium',
        color: '#64748b',
        textAlign: 'center',
        marginTop: 2,
    },
    numberBadge: {
        marginTop: 10,
        backgroundColor: 'rgba(0,0,0,0.03)',
        paddingHorizontal: 12,
        paddingVertical: 2,
        borderRadius: 8,
    },
    numberText: {
        fontSize: 13,
        fontFamily: 'DMSans_700Bold',
    },
    infoCard: {
        marginTop: 24,
        backgroundColor: '#1a2e0a',
        borderRadius: 24,
        padding: 20,
        borderWidth: 1,
        borderColor: '#2d4d11',
    },
    infoCardHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
        marginBottom: 10,
    },
    infoCardTitle: {
        fontSize: 15,
        fontFamily: 'NotoSansDevanagari_600SemiBold',
        color: '#ffffff',
    },
    infoCardText: {
        fontSize: 13,
        fontFamily: 'NotoSansDevanagari_400Regular',
        color: '#cbd5e1',
        lineHeight: 20,
        opacity: 0.9,
    },
    footerSpacing: {
        height: 40,
    },
});
