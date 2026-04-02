import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, StatusBar } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { useBackHandler } from '../hooks/useBackHandler';
import * as Location from 'expo-location';
import { WeatherScreenSkeleton } from '../components/SkeletonLoader';
import { useFarmerStore } from '../store';
import { translations } from '../utils/translations';

export default function WeatherScreen() {
    const navigation = useNavigation();
    const { language: storedLang } = useFarmerStore();
    const language = storedLang || 'hi';
    const t = translations[language] || translations['hi'];
    useBackHandler();

    const [currentWeather, setCurrentWeather] = React.useState(null);
    const [forecastData, setForecastData] = React.useState([]);
    const [displayLocation, setDisplayLocation] = React.useState('विदर्भ, महाराष्ट्र');
    const [weatherLoading, setWeatherLoading] = React.useState(true);
    const API_KEY = process.env.EXPO_PUBLIC_OPENWEATHER_API_KEY;

    React.useEffect(() => {
        const fetchWeatherData = async () => {
            try {
                let { status } = await Location.requestForegroundPermissionsAsync();
                let lat = 21.1458; // Default Nagpur
                let lon = 79.0882;

                if (status === 'granted') {
                    const location = await Location.getCurrentPositionAsync({});
                    lat = location.coords.latitude;
                    lon = location.coords.longitude;

                    const reverseGeocode = await Location.reverseGeocodeAsync({
                        latitude: lat,
                        longitude: lon,
                    });
                    if (reverseGeocode.length > 0) {
                        setDisplayLocation(`${reverseGeocode[0].city || reverseGeocode[0].district}, ${reverseGeocode[0].region}`);
                    }
                }

                // Current Weather
                const currRes = await fetch(
                    `https://api.openweathermap.org/data/2.5/weather?lat=${lat}&lon=${lon}&units=metric&appid=${API_KEY}`
                );
                const currData = await currRes.json();
                if (currData.cod === 200) setCurrentWeather(currData);

                // 5-Day Forecast
                const foreRes = await fetch(
                    `https://api.openweathermap.org/data/2.5/forecast?lat=${lat}&lon=${lon}&units=metric&appid=${API_KEY}`
                );
                const foreData = await foreRes.json();
                if (foreData.cod === "200") {
                    const daily = foreData.list.filter(item => item.dt_txt.includes("12:00:00"));
                    const formatted = daily.map(item => {
                        const date = new Date(item.dt * 1000);
                        const days = [t.days.sun, t.days.mon, t.days.tue, t.days.wed, t.days.thu, t.days.fri, t.days.sat];
                        return {
                            day: days[date.getDay()],
                            icon: getWeatherIcon(item.weather[0].main),
                            temp: `${Math.round(item.main.temp)}°`,
                            rawDate: date
                        };
                    });
                    setForecastData(formatted);
                }
            } catch (error) {
                console.error('Weather fetch error:', error);
            } finally {
                setWeatherLoading(false);
            }
        };

        fetchWeatherData();
    }, [API_KEY]);

    const getWeatherIcon = (condition) => {
        switch (condition?.toLowerCase()) {
            case 'rain': return 'rainy-outline';
            case 'clouds': return 'cloudy-outline';
            case 'clear': return 'sunny-outline';
            default: return 'partly-sunny-outline';
        }
    };

    return (
        <SafeAreaView style={styles.safe}>
            <StatusBar barStyle="dark-content" backgroundColor="#faf7f1" />

            {/* Header */}
            <View style={styles.topHeader}>
                <View style={{ width: 60 }} />
                <Text style={styles.screenTitle}>{t.weatherMitra}</Text>
                <View style={{ width: 60 }} />
                {/* Spacer to center title */}
            </View>

            <ScrollView style={styles.container} contentContainerStyle={styles.scrollContent}>

                {weatherLoading ? (
                    <WeatherScreenSkeleton />
                ) : (
                    <>
                        {/* Location Pin */}
                        <View style={styles.locationContainer}>
                            <Ionicons name="location" size={18} color="#ef4444" />
                            <Text style={styles.locationText}>{displayLocation}</Text>
                        </View>

                        {/* Main Temperature Display */}
                        <View style={styles.mainTempContainer}>
                            <Text style={styles.largeTemp}>
                                {currentWeather?.main?.temp ? Math.round(currentWeather.main.temp) : '28'}°
                            </Text>
                            <View style={styles.conditionRow}>
                                <Ionicons
                                    name={getWeatherIcon(currentWeather?.weather?.[0]?.main).replace('-outline', '')}
                                    size={24}
                                    color="#6b7280"
                                />
                                <Text style={styles.conditionText}>
                                    {currentWeather?.weather?.[0]?.main || 'आंशिक बादल'}
                                </Text>
                            </View>
                        </View>

                        {/* Metrics Row (4 Columns) */}
                        <View style={styles.metricsRow}>
                            <View style={styles.metricItem}>
                                <Text style={styles.metricValue}>
                                    {currentWeather ? Math.round(currentWeather.wind.speed * 3.6) : '18'}km/h
                                </Text>
                                <Text style={styles.metricLabel}>{t.metricWind}</Text>
                            </View>
                            <View style={styles.metricItem}>
                                <Text style={styles.metricValue}>
                                    {currentWeather ? currentWeather.main.humidity : '65'}%
                                </Text>
                                <Text style={styles.metricLabel}>{t.metricHumidity}</Text>
                            </View>
                            <View style={styles.metricItem}>
                                <Text style={styles.metricValue}>
                                    {currentWeather?.clouds?.all || '40'}%
                                </Text>
                                <Text style={styles.metricLabel}>{t.metricClouds}</Text>
                            </View>
                            <View style={styles.metricItem}>
                                <Text style={styles.metricValue}>
                                    {currentWeather ? Math.round(currentWeather.main.feels_like) : '31'}°
                                </Text>
                                <Text style={styles.metricLabel}>{t.metricFeelsLike}</Text>
                            </View>
                        </View>

                        {/* AI Advisory Card */}
                        <View style={styles.advisoryCard}>
                            <View style={styles.advisoryTitleRow}>
                                <Ionicons name="leaf" size={20} color="#16a34a" />
                                <Text style={styles.advisoryTitle}>{t.advisoryTitle}<Text style={styles.geminiText}>GEMINI</Text></Text>
                            </View>
                            <Text style={styles.advisoryContent}>
                                {currentWeather?.weather[0]?.main === 'Rain'
                                    ? t.rainAdvisory
                                    : t.normalAdvisory}
                            </Text>
                        </View>

                        {/* Forecast Section */}
                        <View style={styles.forecastSection}>
                            <Text style={[styles.sectionLabel, { paddingHorizontal: 14 }]}>{t.forecast5Day}</Text>
                            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.forecastScroll}>
                                {(forecastData.length > 0 ? forecastData : [
                                    { day: 'आज', icon: 'cloudy-outline', temp: '28°', active: true },
                                    { day: 'कल', icon: 'rainy-outline', temp: '24°' },
                                    { day: 'बुध', icon: 'partly-sunny-outline', temp: '26°' },
                                ]).map((item, index) => (
                                    <View key={index} style={[styles.forecastCard, item.active && styles.activeForecastCard]}>
                                        <Text style={[styles.forecastDay, item.active && styles.activeText]}>{item.day}</Text>
                                        <Ionicons
                                            name={item.icon}
                                            size={28}
                                            color={item.active ? '#ffffff' : '#6b7280'}
                                            style={styles.forecastIcon}
                                        />
                                        <Text style={[styles.forecastTemp, item.active && styles.activeText]}>{item.temp}</Text>
                                    </View>
                                ))}
                            </ScrollView>
                        </View>

                    </>
                )}
            </ScrollView>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    safe: {
        flex: 1,
        backgroundColor: '#faf7f1',
    },
    topHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 20,
        paddingVertical: 20,
    },
    backBtn: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    backText: {
        marginLeft: 4,
        fontSize: 16,
        color: '#6b7280',
        fontFamily: 'NotoSansDevanagari_400Regular',
    },
    screenTitle: {
        fontSize: 20,
        fontFamily: 'DMSans_700Bold',
        color: '#1a2e0a',
    },
    container: {
        flex: 1,
    },
    scrollContent: {
        paddingBottom: 40,
    },
    locationContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        marginTop: 10,
        paddingHorizontal: 14,
    },
    locationText: {
        marginLeft: 6,
        fontSize: 18,
        color: '#1a2e0a',
        fontFamily: 'NotoSansDevanagari_500Medium',
    },
    mainTempContainer: {
        alignItems: 'center',
        marginTop: 15,
        marginBottom: 20,
        paddingHorizontal: 14,
    },
    largeTemp: {
        fontSize: 110,
        fontFamily: 'PlayfairDisplay_700Bold',
        color: '#1a2e0a',
        lineHeight: 120,
    },
    conditionRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginTop: -10,
    },
    conditionText: {
        marginLeft: 8,
        fontSize: 20,
        color: '#6b7280',
        fontFamily: 'NotoSansDevanagari_500Medium',
    },
    metricsRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        paddingVertical: 20,
        paddingHorizontal: 14,
        borderTopWidth: 1,
        borderBottomWidth: 1,
        borderColor: 'rgba(0,0,0,0.05)',
    },
    metricItem: {
        alignItems: 'center',
        width: '25%',
    },
    metricValue: {
        fontSize: 18,
        fontFamily: 'DMSans_700Bold',
        color: '#1a2e0a',
    },
    metricLabel: {
        fontSize: 12,
        color: '#6b7280',
        marginTop: 4,
        fontFamily: 'NotoSansDevanagari_400Regular',
    },
    advisoryCard: {
        backgroundColor: '#ffffff',
        borderRadius: 24,
        padding: 24,
        marginTop: 15,
        marginHorizontal: 14,
        borderWidth: 1.3,
        borderColor: '#e2e8f0',
        // Note: Reference used dark background, but we keep light theme as requested "maintain our color theme"
    },
    advisoryTitleRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 12,
    },
    advisoryTitle: {
        marginLeft: 10,
        fontSize: 16,
        fontFamily: 'NotoSansDevanagari_600SemiBold',
        color: '#1a2e0a',
    },
    geminiText: {
        color: '#16a34a',
        fontFamily: 'DMSans_700Bold',
    },
    advisoryContent: {
        fontSize: 15,
        color: '#4b5563',
        fontFamily: 'NotoSansDevanagari_400Regular',
        lineHeight: 22,
    },
    forecastSection: {
        marginTop: 25,

    },
    sectionLabel: {
        fontSize: 15,
        color: '#6b7280',
        fontFamily: 'NotoSansDevanagari_500Medium',
        marginBottom: 16,
    },
    forecastScroll: {
        flexDirection: 'row',
        paddingHorizontal: 14,
    },
    forecastCard: {
        width: 75,
        height: 120,
        backgroundColor: '#ffffff',
        borderRadius: 18,
        borderWidth: 1.3,
        borderColor: '#e2e8f0',
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: 12,
    },
    activeForecastCard: {
        backgroundColor: '#115607',
        borderColor: '#115607',
    },
    forecastDay: {
        fontSize: 12,
        color: '#6b7280',
        fontFamily: 'NotoSansDevanagari_500Medium',
    },
    forecastIcon: {
        marginVertical: 10,
    },
    forecastTemp: {
        fontSize: 16,
        fontFamily: 'DMSans_700Bold',
        color: '#1a2e0a',
    },
    activeText: {
        color: '#ffffff',
    },
});
