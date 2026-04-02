import React from 'react';
import {
    View,
    Text,
    StyleSheet,
    ScrollView,
    TouchableOpacity,
    StatusBar,
    Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { useBackHandler } from '../hooks/useBackHandler';
import { useFarmerStore } from '../store';
import { translations } from '../utils/translations';

const { width } = Dimensions.get('window');

export default function CropsScreen() {
    const navigation = useNavigation();
    const { language: storedLang } = useFarmerStore();
    const language = storedLang || 'hi';
    const t = translations[language] || translations['hi'];
    useBackHandler();

    const nutrients = [
        { label: 'Nitrogen (N)', value: '72%', status: 'Normal', color: '#3b82f6' },
        { label: 'Phosphorus (P)', value: '45%', status: 'Low', color: '#f59e0b' },
        { label: 'Potassium (K)', value: '88%', status: 'High', color: '#10b981' },
        { label: 'Soil pH', value: '6.5', status: 'Ideal', color: '#8b5cf6' },
    ];

    const reports = [
        { date: '24 Feb 2024', location: 'Section A-12', result: 'अति स्वस्थ (Very Healthy)' },
        { date: '12 Jan 2024', location: 'Section B-04', result: 'स्वस्थ (Healthy)' },
    ];

    return (
        <SafeAreaView style={styles.safe}>
            <StatusBar barStyle="dark-content" backgroundColor="#faf7f1" />

            <ScrollView
                style={styles.container}
                contentContainerStyle={styles.scrollContent}
                showsVerticalScrollIndicator={false}
            >
                {/* Header inside ScrollView for Entire Page Scroll */}
                <View style={styles.headerRow}>
                    <Text style={styles.screenTitle}>{t.mittiTitle}</Text>
                    <TouchableOpacity style={styles.infoBtn}>
                        <Ionicons name="information-circle-outline" size={24} color="#6b7280" />
                    </TouchableOpacity>
                </View>

                {/* Soil Health Status Meter */}
                <View style={styles.statusCard}>
                    <View style={styles.statusContent}>
                        <View style={styles.meterContainer}>
                            <View style={styles.meterOuter}>
                                <View style={styles.meterInner}>
                                    <Text style={styles.meterPercentage}>92</Text>
                                    <Text style={styles.meterLabel}>{t.scoreLabel}</Text>
                                </View>
                            </View>
                        </View>
                        <View style={styles.statusInfo}>
                            <Text style={styles.statusTitle}>{t.veryHealthy}</Text>
                            <Text style={styles.statusSubtitle}>Very Healthy Soil</Text>
                            <View style={styles.lastTestedRow}>
                                <Ionicons name="time-outline" size={14} color="#64748b" />
                                <Text style={styles.lastTestedText}>{t.lastTested}: 24 Feb</Text>
                            </View>
                        </View>
                    </View>
                    <TouchableOpacity
                        style={styles.testBtn}
                        onPress={() => navigation.navigate('FasalDoc')}
                    >
                        <Text style={styles.testBtnText}>{t.newTest}</Text>
                    </TouchableOpacity>
                </View>

                {/* Nutrient Grid */}
                <View style={styles.sectionHeader}>
                    <Text style={styles.sectionTitle}>{t.nutrientsTitle}</Text>
                    <TouchableOpacity>
                        <Text style={styles.viewMore}>{t.seeAll}</Text>
                    </TouchableOpacity>
                </View>

                <View style={styles.nutrientGrid}>
                    {nutrients.map((item, index) => (
                        <View key={index} style={styles.nutrientCard}>
                            <View style={[styles.nutrientDot, { backgroundColor: item.color }]} />
                            <Text style={styles.nutrientValue}>{item.value}</Text>
                            <Text style={styles.nutrientLabel}>{item.label}</Text>
                            <View style={styles.statusBadge}>
                                <Text style={[styles.statusBadgeText, { color: item.color }]}>{item.status}</Text>
                            </View>
                        </View>
                    ))}
                </View>

                {/* AI Soil Advisory */}
                <View style={styles.advisoryCard}>
                    <View style={styles.advisoryHeader}>
                        <MaterialCommunityIcons name="molecule" size={20} color="#16a34a" />
                        <Text style={styles.advisoryTitle}>{t.soilAdvisoryTitle}<Text style={styles.geminiText}>GEMINI</Text></Text>
                    </View>
                    <Text style={styles.advisoryContent}>
                        {t.soilAdvisoryContent}
                    </Text>
                </View>

                {/* Recent Activity */}
                <View style={styles.sectionHeader}>
                    <Text style={styles.sectionTitle}>{t.historyTitle}</Text>
                </View>

                <View style={styles.historyContainer}>
                    {reports.map((report, index) => (
                        <TouchableOpacity key={index} style={styles.historyItem}>
                            <View style={styles.historyIcon}>
                                <Ionicons name="document-text-outline" size={24} color="#4b5563" />
                            </View>
                            <View style={styles.historyMain}>
                                <Text style={styles.historyDate}>{report.date} · {report.location}</Text>
                                <Text style={styles.historyResult}>{report.result}</Text>
                            </View>
                            <Ionicons name="chevron-forward" size={20} color="#cbd5e1" />
                        </TouchableOpacity>
                    ))}
                </View>
            </ScrollView>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    safe: {
        flex: 1,
        backgroundColor: '#faf7f1',
        paddingTop: 0,
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
    container: {
        flex: 1,
    },
    scrollContent: {
        paddingBottom: 100,
        paddingHorizontal: 14,
    },
    statusCard: {
        backgroundColor: '#ffffff',
        borderRadius: 24,
        padding: 20,
        borderWidth: 1.3,
        borderColor: '#e2e8f0',
        marginBottom: 24,
    },
    statusContent: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 20,
    },
    meterContainer: {
        width: 100,
        height: 100,
        marginRight: 20,
    },
    meterOuter: {
        width: 100,
        height: 100,
        borderRadius: 50,
        borderWidth: 8,
        borderColor: '#f0fdf4',
        borderTopColor: '#16a34a',
        justifyContent: 'center',
        alignItems: 'center',
        transform: [{ rotate: '45deg' }],
    },
    meterInner: {
        transform: [{ rotate: '-45deg' }],
        alignItems: 'center',
    },
    meterPercentage: {
        fontSize: 28,
        fontFamily: 'PlayfairDisplay_700Bold',
        color: '#1a2e0a',
    },
    meterLabel: {
        fontSize: 10,
        color: '#64748b',
        fontFamily: 'NotoSansDevanagari_500Medium',
        marginTop: -4,
    },
    statusInfo: {
        flex: 1,
    },
    statusTitle: {
        fontSize: 24,
        fontFamily: 'NotoSansDevanagari_700Bold',
        color: '#1a2e0a',
    },
    statusSubtitle: {
        fontSize: 14,
        color: '#16a34a',
        fontFamily: 'DMSans_500Medium',
        marginTop: 2,
    },
    lastTestedRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginTop: 8,
        gap: 6,
    },
    lastTestedText: {
        fontSize: 12,
        color: '#64748b',
        fontFamily: 'NotoSansDevanagari_400Regular',
    },
    testBtn: {
        backgroundColor: '#1a2e0a',
        borderRadius: 16,
        paddingVertical: 14,
        alignItems: 'center',
    },
    testBtnText: {
        color: '#ffffff',
        fontSize: 15,
        fontFamily: 'NotoSansDevanagari_600SemiBold',
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
    viewMore: {
        fontSize: 13,
        color: '#64748b',
        fontFamily: 'DMSans_500Medium',
    },
    nutrientGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 12,
        marginBottom: 24,
    },
    nutrientCard: {
        backgroundColor: '#ffffff',
        borderRadius: 20,
        padding: 16,
        borderWidth: 1.3,
        borderColor: '#e2e8f0',
        width: (width - 28 - 12) / 2, // 2 columns with gap
        alignItems: 'center',
    },
    nutrientDot: {
        width: 8,
        height: 8,
        borderRadius: 4,
        position: 'absolute',
        top: 12,
        right: 12,
    },
    nutrientValue: {
        fontSize: 24,
        fontFamily: 'PlayfairDisplay_700Bold',
        color: '#1a2e0a',
    },
    nutrientLabel: {
        fontSize: 11,
        color: '#64748b',
        fontFamily: 'DMSans_500Medium',
        marginTop: 2,
    },
    statusBadge: {
        marginTop: 8,
        paddingHorizontal: 8,
        paddingVertical: 2,
        borderRadius: 6,
        backgroundColor: 'rgba(0,0,0,0.02)',
    },
    statusBadgeText: {
        fontSize: 10,
        fontFamily: 'DMSans_700Bold',
    },
    advisoryCard: {
        backgroundColor: '#ffffff',
        borderRadius: 24,
        padding: 20,
        borderWidth: 1.3,
        borderColor: '#e2e8f0',
        marginBottom: 24,
    },
    advisoryHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 10,
        gap: 8,
    },
    advisoryTitle: {
        fontSize: 15,
        fontFamily: 'NotoSansDevanagari_600SemiBold',
        color: '#1a2e0a',
    },
    geminiText: {
        color: '#16a34a',
        fontFamily: 'DMSans_700Bold',
    },
    advisoryContent: {
        fontSize: 14,
        fontFamily: 'NotoSansDevanagari_400Regular',
        color: '#475569',
        lineHeight: 20,
    },
    historyContainer: {
        gap: 12,
    },
    historyItem: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#ffffff',
        borderRadius: 18,
        padding: 16,
        borderWidth: 1.3,
        borderColor: '#e2e8f0',
    },
    historyIcon: {
        width: 44,
        height: 44,
        borderRadius: 12,
        backgroundColor: '#f1f5f9',
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 16,
    },
    historyMain: {
        flex: 1,
    },
    historyDate: {
        fontSize: 12,
        color: '#64748b',
        fontFamily: 'DMSans_500Medium',
    },
    historyResult: {
        fontSize: 15,
        fontFamily: 'NotoSansDevanagari_600SemiBold',
        color: '#1a2e0a',
        marginTop: 2,
    },
});
