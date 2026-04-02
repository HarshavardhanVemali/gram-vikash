import React from 'react';
import {
    View,
    Text,
    StyleSheet,
    ScrollView,
    TouchableOpacity,
    SafeAreaView,
    StatusBar,
    Dimensions,
} from 'react-native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useBackHandler } from '../hooks/useBackHandler';
import { useFarmerStore } from '../store';
import { translations } from '../utils/translations';

const { width } = Dimensions.get('window');

export default function SchemesScreen() {
    const { language: storedLang } = useFarmerStore();
    const language = storedLang || 'hi';
    const t = translations[language] || translations['hi'];
    useBackHandler();

    const schemes = [
        {
            id: 'pm-kisan',
            title: 'PM-KISAN',
            subtitle: 'Kisan Samman Nidhi',
            amount: '₹6k',
            amountSub: t.perYear,
            status: t.preFilled,
        },
        {
            id: 'pmfby',
            title: 'PMFBY',
            subtitle: 'Fasal Bima Yojana',
            amount: '2%',
            amountSub: t.premiumLabel,
            status: t.preFilled,
        },
    ];

    return (
        <SafeAreaView style={styles.safe}>
            <StatusBar barStyle="dark-content" backgroundColor="#faf7f1" />

            <ScrollView
                style={styles.container}
                contentContainerStyle={styles.scrollContent}
                showsVerticalScrollIndicator={false}
            >
                {/* Header matching Crops page header */}
                <View style={styles.headerRow}>
                    <Text style={styles.screenTitle}>{t.sarkarTitle}</Text>
                    <TouchableOpacity style={styles.infoBtn}>
                        <Ionicons name="information-circle-outline" size={24} color="#6b7280" />
                    </TouchableOpacity>
                </View>

                {/* Schemes Cards - Efficient Side-by-Side Layout */}
                {schemes.map((scheme) => (
                    <View key={scheme.id} style={styles.schemeCard}>
                        <View style={styles.schemeContent}>
                            {/* Value Display on Left (Matching Meter Size) */}
                            <View style={styles.valueContainer}>
                                <View style={styles.valueOuter}>
                                    <View style={styles.valueInner}>
                                        <Text style={styles.amountDisplay}>{scheme.amount}</Text>
                                        <Text style={styles.amountLabel}>{scheme.amountSub}</Text>
                                    </View>
                                </View>
                            </View>

                            {/* Info Section on Right */}
                            <View style={styles.infoSection}>
                                <Text style={styles.schemeTitle}>{scheme.title}</Text>
                                <Text style={styles.schemeSubtitle}>{scheme.subtitle}</Text>
                                <View style={styles.statusBadgeRow}>
                                    <View style={styles.statusBadge}>
                                        <Ionicons name="checkmark-circle" size={14} color="#16a34a" />
                                        <Text style={styles.statusText}>{scheme.status}</Text>
                                    </View>
                                </View>
                            </View>
                        </View>

                        {/* CTA Button */}
                        <TouchableOpacity style={styles.applyBtn}>
                            <Text style={styles.applyBtnText}>{t.applyNow}</Text>
                        </TouchableOpacity>
                    </View>
                ))}

                {/* Other Schemes Placeholder */}
                <View style={styles.otherInfo}>
                    <Text style={styles.infoTitle}>{t.othersTitle}</Text>
                    <Text style={styles.infoDesc}>{t.othersComingSoon}</Text>
                </View>

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
        paddingHorizontal: 14,
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
    schemeCard: {
        backgroundColor: '#ffffff',
        borderRadius: 24,
        padding: 20,
        borderWidth: 1.3,
        borderColor: '#e2e8f0',
        marginBottom: 24,
    },
    schemeContent: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 20,
    },
    valueContainer: {
        width: 100,
        height: 100,
        marginRight: 20,
    },
    valueOuter: {
        width: 100,
        height: 100,
        borderRadius: 50,
        backgroundColor: '#f6f1e6', // Cream highlight instead of meter ring
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 1.3,
        borderColor: '#f1f5f9',
    },
    valueInner: {
        alignItems: 'center',
    },
    amountDisplay: {
        fontSize: 28,
        fontFamily: 'PlayfairDisplay_700Bold',
        color: '#1a2e0a',
    },
    amountLabel: {
        fontSize: 10,
        color: '#64748b',
        fontFamily: 'NotoSansDevanagari_500Medium',
        marginTop: -2,
    },
    infoSection: {
        flex: 1,
    },
    schemeTitle: {
        fontSize: 22,
        fontFamily: 'NotoSansDevanagari_700Bold',
        color: '#1a2e0a',
    },
    schemeSubtitle: {
        fontSize: 14,
        color: '#64748b',
        fontFamily: 'DMSans_500Medium',
        marginTop: 2,
    },
    statusBadgeRow: {
        flexDirection: 'row',
        marginTop: 8,
    },
    statusBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
    },
    statusText: {
        fontSize: 12,
        color: '#16a34a',
        fontFamily: 'NotoSansDevanagari_600SemiBold',
    },
    applyBtn: {
        backgroundColor: '#1a2e0a',
        borderRadius: 30,
        paddingVertical: 14,
        alignItems: 'center',
    },
    applyBtnText: {
        color: '#ffffff',
        fontSize: 15,
        fontFamily: 'NotoSansDevanagari_600SemiBold',
    },
    otherInfo: {
        alignItems: 'center',
        marginTop: 10,
        paddingVertical: 20,
    },
    infoTitle: {
        fontSize: 14,
        fontFamily: 'NotoSansDevanagari_600SemiBold',
        color: '#64748b',
    },
    infoDesc: {
        fontSize: 12,
        color: '#94a3b8',
        fontFamily: 'NotoSansDevanagari_400Regular',
        marginTop: 4,
        textAlign: 'center',
    },
});
