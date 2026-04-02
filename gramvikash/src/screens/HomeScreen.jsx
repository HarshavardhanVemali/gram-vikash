import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, StatusBar, Image, Animated } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { useFarmerStore } from '../store';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import * as Location from 'expo-location';
import { HomeScreenSkeleton } from '../components/SkeletonLoader';
import { translations } from '../utils/translations';

export default function HomeScreen() {
    const navigation = useNavigation();
    const { farmer, language: storedLang } = useFarmerStore();
    const language = storedLang || 'hi';
    const t = translations[language] || translations['hi'];


    const [weatherData, setWeatherData] = React.useState(null);
    const [weatherLoading, setWeatherLoading] = React.useState(true);
    const [displayLocation, setDisplayLocation] = React.useState('Nagpur');
    const API_KEY = process.env.EXPO_PUBLIC_OPENWEATHER_API_KEY;

    React.useEffect(() => {
        const getWeatherData = async () => {
            try {
                let { status } = await Location.requestForegroundPermissionsAsync();
                let lat = 21.1458; // Default Nagpur
                let lon = 79.0882;

                if (status === 'granted') {
                    const location = await Location.getCurrentPositionAsync({});
                    lat = location.coords.latitude;
                    lon = location.coords.longitude;

                    // Reverse geocode to get city name for display
                    const reverseGeocode = await Location.reverseGeocodeAsync({
                        latitude: lat,
                        longitude: lon,
                    });
                    if (reverseGeocode.length > 0) {
                        setDisplayLocation(reverseGeocode[0].city || reverseGeocode[0].district || 'My Location');
                    }
                }

                const response = await fetch(
                    `https://api.openweathermap.org/data/2.5/weather?lat=${lat}&lon=${lon}&units=metric&appid=${API_KEY}`
                );
                const data = await response.json();
                if (data.cod === 200) {
                    setWeatherData(data);
                }
            } catch (error) {
                console.error('Weather fetch error:', error);
            } finally {
                setWeatherLoading(false);
            }
        };

        getWeatherData();
        const interval = setInterval(getWeatherData, 600000);
        return () => clearInterval(interval);
    }, [API_KEY]);

    // Map weather conditions to icons and Hindi text
    const getWeatherStyle = (condition) => {
        switch (condition?.toLowerCase()) {
            case 'rain':
            case 'drizzle':
                return { icon: 'rainy', text: t.weatherRain, color: '#0ea5e9' };
            case 'clouds':
                return { icon: 'cloudy', text: t.weatherCloudy, color: '#64748b' };
            case 'clear':
                return { icon: 'sunny', text: t.weatherClear, color: '#f59e0b' };
            default:
                return { icon: 'partly-sunny', text: t.weatherDefault, color: '#10b981' };
        }
    };

    const weatherInfo = getWeatherStyle(weatherData?.weather[0]?.main);

    return (
        <View style={styles.safe}>
            <StatusBar barStyle="light-content" translucent backgroundColor="transparent" />

            <ScrollView style={styles.container} contentContainerStyle={styles.scrollContent}>
                {/* Gradient Header - Now inside ScrollView */}
                <LinearGradient
                    colors={['#115607ff', '#ffffff']}
                    style={styles.brandHeader}
                >
                    <SafeAreaView edges={['top']}>
                        <View style={styles.headerTitleRow}>
                            <View style={styles.headerLeft}>
                                <Text style={styles.brandText}>GramVikash</Text>
                                <Text style={styles.headerEmoji}>🌾</Text>
                            </View>
                            <TouchableOpacity
                                style={styles.profileBtn}
                                activeOpacity={0.7}
                                onPress={() => navigation.navigate('Profile')}
                            >
                                <Ionicons name="person-circle-outline" size={34} color="#ffffff" />
                            </TouchableOpacity>
                        </View>
                        {displayLocation ? <Text style={styles.locationText}>{displayLocation}</Text> : null}
                    </SafeAreaView>
                </LinearGradient>

                <View style={styles.mainContent}>
                    {/* Greeting Row */}
                    <View style={styles.heroSection}>
                        <View style={styles.welcomeRow}>
                            <View>

                            </View>
                        </View>
                    </View>

                    {/* Hero Image Section */}
                    <View style={styles.heroContainer}>
                        <Image
                            source={require('../assets/images/farmer_hero.png')}
                            style={styles.heroImage}
                            resizeMode="cover"
                        />
                    </View>

                    {/* Main Weather Card */}
                    {weatherLoading ? (
                        <HomeScreenSkeleton />
                    ) : (
                        <TouchableOpacity
                            style={[styles.card, styles.mainWeatherCard]}
                            activeOpacity={0.9}
                            onPress={() => navigation.navigate('Weather')}
                        >
                            <View style={styles.mainWeatherLeft}>
                                <Text style={styles.nowLabel}>{t.nowLabel}</Text>
                                <Text style={styles.mainTemp}>
                                    {weatherData?.main?.temp ? Math.round(weatherData.main.temp) : '26'}°
                                </Text>
                                <Text style={styles.highLow}>
                                    H: {weatherData?.main?.temp_max ? Math.round(weatherData.main.temp_max) : '28'}°  L: {weatherData?.main?.temp_min ? Math.round(weatherData.main.temp_min) : '24'}°
                                </Text>
                                <View style={[styles.rainSuggestion, { backgroundColor: `${weatherInfo.color}10` }]}>
                                    <Ionicons name="information-circle-outline" size={14} color={weatherInfo.color} />
                                    <Text style={[styles.rainText, { color: weatherInfo.color }]}>
                                        {weatherInfo.text}
                                    </Text>
                                </View>
                            </View>
                            <View style={styles.mainWeatherRight}>
                                <Ionicons
                                    name={weatherInfo.icon}
                                    size={80}
                                    color={weatherInfo.color}
                                />
                                <View style={{ alignItems: 'flex-end', marginTop: 8 }}>
                                    <Text style={styles.conditionText}>
                                        {weatherData?.weather?.[0]?.main || 'Cloudy'}
                                    </Text>
                                    <Text style={styles.feelsLike}>
                                        Feels like {weatherData?.main?.feels_like ? Math.round(weatherData.main.feels_like) : '31'}°
                                    </Text>
                                </View>
                            </View>
                        </TouchableOpacity>
                    )}

                    {/* Dashboard Grid */}
                    <View style={styles.dashboardGrid}>
                        {/* HumBolo Card */}
                        <TouchableOpacity
                            style={[styles.card, styles.humBoloCard]}
                            activeOpacity={0.9}
                            onPress={() => navigation.navigate('HumBolo')}
                        >
                            <View style={styles.humBoloIconContainer}>
                                <Ionicons name="mic" size={32} color="#ffffff" />
                            </View>
                            <View style={styles.humBoloContent}>
                                <Text style={styles.humBoloTitle}>{t.humBoloTitle}</Text>
                                <Text style={styles.humBoloSub}>{t.humBoloSub}</Text>
                            </View>
                        </TouchableOpacity>

                        {/* Mid Row */}
                        <View style={styles.midRow}>
                            <TouchableOpacity
                                style={[styles.card, styles.fasalDocCard]}
                                activeOpacity={0.9}
                                onPress={() => navigation.navigate('FasalDoc')}
                            >
                                <View style={styles.midCardIconContainer}>
                                    <Ionicons name="leaf" size={24} color="#4a7543" />
                                </View>
                                <View>
                                    <Text style={styles.midCardTitle}>FasalDoc</Text>
                                    <Text style={styles.midCardSub}>{t.fasalDocSub}</Text>
                                </View>
                            </TouchableOpacity>

                            <TouchableOpacity
                                style={[styles.card, styles.sarkarSaathiCard]}
                                activeOpacity={0.9}
                                onPress={() => navigation.navigate('Schemes')}
                            >
                                <View style={styles.dotIndicator} />
                                <View style={styles.midCardIconContainer}>
                                    <Ionicons name="business" size={24} color="#6b7c5a" />
                                </View>
                                <Text style={styles.midCardTitleCenter}>SarkarSaathi</Text>
                            </TouchableOpacity>
                        </View>

                        {/* Crop Suggestions */}
                        <View style={styles.cropSuggestions}>
                            <Text style={styles.sectionLabel}>{t.cropSuggestions}</Text>
                            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.cropScroll}>
                                <TouchableOpacity style={[styles.card, styles.suggestionItem]} activeOpacity={0.8}>
                                    <View style={styles.suggestionIcon}>
                                        <Ionicons name="water" size={20} color="#4a7543" />
                                    </View>
                                    <Text style={styles.suggestionText}>{t.suggestion1}</Text>
                                </TouchableOpacity>
                                <TouchableOpacity style={[styles.card, styles.suggestionItem]} activeOpacity={0.8}>
                                    <View style={styles.suggestionIcon}>
                                        <Ionicons name="flask" size={20} color="#4a7543" />
                                    </View>
                                    <Text style={styles.suggestionText}>{t.suggestion2}</Text>
                                </TouchableOpacity>
                            </ScrollView>
                        </View>

                        {/* Bottom Utility Grid */}
                        <View style={styles.bottomRow}>
                            <TouchableOpacity
                                style={[styles.card, styles.utilityCard]}
                                activeOpacity={0.9}
                                onPress={() => navigation.navigate('Weather')}
                            >
                                <View style={[styles.utilityIconContainer, { backgroundColor: '#e0f2fe' }]}>
                                    <Ionicons name="cloud" size={24} color="#0284c7" />
                                </View>
                                <Text style={styles.utilityLabel}>{t.navWeather}</Text>
                            </TouchableOpacity>

                            <TouchableOpacity
                                style={[styles.card, styles.utilityCard]}
                                activeOpacity={0.9}
                                onPress={() => navigation.navigate('Market')}
                            >
                                <View style={[styles.utilityIconContainer, { backgroundColor: '#fef3c7' }]}>
                                    <Ionicons name="stats-chart" size={24} color="#d97706" />
                                </View>
                                <Text style={styles.utilityLabel}>{t.navMarket}</Text>
                            </TouchableOpacity>

                            <TouchableOpacity
                                style={[styles.card, styles.utilityCard]}
                                activeOpacity={0.9}
                                onPress={() => navigation.navigate('Emergency')}
                            >
                                <View style={[styles.utilityIconContainer, { backgroundColor: '#fee2e2' }]}>
                                    <Ionicons name="warning" size={24} color="#dc2626" />
                                </View>
                                <Text style={styles.utilityLabel}>{t.navEmergency}</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>

                <View style={{ height: 100 }} />
            </ScrollView>
        </View>
    );
}

const styles = StyleSheet.create({
    safe: { flex: 1, backgroundColor: '#ffffff' },
    container: { flex: 1 },
    scrollContent: { paddingBottom: 20 },
    mainContent: { padding: 12, marginTop: -20 }, // Slight negative margin to pull content over the gradient end

    brandHeader: {
        paddingBottom: 40,
        paddingHorizontal: 24,
    },
    brandText: {
        color: '#ffffff',
        fontSize: 26,
        fontFamily: 'PlayfairDisplay_700Bold',
    },
    headerEmoji: {
        fontSize: 26,
        marginLeft: 6,
    },
    headerTitleRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginTop: 10,
    },
    headerLeft: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    profileBtn: {
        width: 44,
        height: 44,
        borderRadius: 22,
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 1.3,
        borderColor: 'rgba(255,255,255,0.2)',
    },
    locationText: {
        color: '#ffffff',
        fontSize: 12,
        marginTop: 6,
        opacity: 0.9,
    },

    // Hero Image Section
    heroContainer: {
        width: '100%',
        height: 220,
        borderRadius: 24,
        overflow: 'hidden',
        marginBottom: 16,
    },
    heroImage: {
        width: '100%',
        height: '100%',
    },

    // Base Card Style (White Card Aesthetic)
    card: {
        backgroundColor: '#ffffff',
        borderRadius: 22,
        borderWidth: 1.3,
        borderColor: '#e2e8f0',
    },

    mainWeatherCard: {
        backgroundColor: '#fff7ed',
        padding: 20,
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: 16,
    },
    mainWeatherLeft: {
        justifyContent: 'space-between',
    },
    nowLabel: {
        fontSize: 18,
        fontFamily: 'DMSans_500Medium',
        color: '#1a2e0a',
    },
    mainTemp: {
        fontSize: 56,
        fontFamily: 'DMSans_700Bold',
        color: '#1a2e0a',
        marginVertical: 2,
    },
    highLow: {
        fontSize: 14,
        fontFamily: 'DMSans_400Regular',
        color: '#6b7c5a',
    },
    mainWeatherRight: {
        alignItems: 'flex-end',
        justifyContent: 'center',
    },
    conditionText: {
        fontSize: 18,
        fontFamily: 'DMSans_500Medium',
        color: '#1a2e0a',
    },
    feelsLike: {
        fontSize: 12,
        fontFamily: 'DMSans_400Regular',
        color: '#6b7c5a',
        marginTop: 2,
    },
    rainSuggestion: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'rgba(217, 119, 6, 0.08)',
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 8,
        marginTop: 8,
    },
    rainText: {
        fontSize: 11,
        fontFamily: 'NotoSansDevanagari_400Regular',
        color: '#d97706',
        marginLeft: 4,
    },

    dashboardGrid: {
        marginTop: 4,
    },
    humBoloCard: {
        padding: 22,
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 16,
    },
    humBoloIconContainer: {
        width: 56,
        height: 56,
        borderRadius: 28,
        backgroundColor: '#115607',
        alignItems: 'center',
        justifyContent: 'center',
    },
    humBoloContent: {
        marginLeft: 16,
    },
    humBoloTitle: {
        fontSize: 18,
        fontFamily: 'DMSans_700Bold',
        color: '#1a2e0a',
    },
    humBoloSub: {
        fontSize: 12,
        fontFamily: 'NotoSansDevanagari_400Regular',
        color: '#6b7c5a',
        marginTop: 4,
    },
    midRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: 16,
    },
    fasalDocCard: {
        width: '58%',
        padding: 16,
        flexDirection: 'row',
        alignItems: 'center',
    },
    midCardIconContainer: {
        width: 44,
        height: 44,
        borderRadius: 12,
        backgroundColor: '#f8fafc',
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: 10,
    },
    midCardTitle: {
        fontSize: 16,
        fontFamily: 'DMSans_700Bold',
        color: '#1a2e0a',
    },
    midCardSub: {
        fontSize: 11,
        fontFamily: 'NotoSansDevanagari_400Regular',
        color: '#6b7c5a',
        marginTop: 4,
    },
    sarkarSaathiCard: {
        width: '38%',
        padding: 16,
        alignItems: 'center',
        justifyContent: 'center',
        position: 'relative',
    },
    dotIndicator: {
        position: 'absolute',
        top: 10,
        right: 10,
        width: 8,
        height: 8,
        borderRadius: 4,
        backgroundColor: '#ef4444',
    },
    midCardTitleCenter: {
        fontSize: 13,
        fontFamily: 'DMSans_700Bold',
        color: '#1a2e0a',
        textAlign: 'center',
        marginTop: 6,
    },
    cropSuggestions: {
        marginBottom: 20,
    },
    sectionLabel: {
        fontSize: 15,
        fontFamily: 'NotoSansDevanagari_600SemiBold',
        color: '#1a2e0a',
        marginBottom: 12,
        marginLeft: 4,
    },
    cropScroll: {
        paddingRight: 10,
    },
    suggestionItem: {
        padding: 16,
        marginRight: 12,
        flexDirection: 'row',
        alignItems: 'center',
    },
    suggestionIcon: {
        width: 32,
        height: 32,
        borderRadius: 8,
        backgroundColor: '#f1f5f9',
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: 12,
    },
    suggestionText: {
        fontSize: 13,
        fontFamily: 'NotoSansDevanagari_400Regular',
        color: '#334155',
    },
    bottomRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
    },
    utilityCard: {
        width: '31%',
        padding: 16,
        alignItems: 'center',
    },
    utilityIconContainer: {
        width: 48,
        height: 48,
        borderRadius: 14,
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 10,
    },
    utilityLabel: {
        fontSize: 13,
        fontFamily: 'NotoSansDevanagari_600SemiBold',
        color: '#1a2e0a',
    },
});