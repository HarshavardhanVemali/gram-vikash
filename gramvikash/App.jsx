import React, { useCallback } from 'react';
import { NavigationContainer, DefaultTheme } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import {
    useFonts,
    PlayfairDisplay_700Bold,
    PlayfairDisplay_600SemiBold
} from '@expo-google-fonts/playfair-display';
import {
    NotoSansDevanagari_400Regular,
    NotoSansDevanagari_500Medium,
    NotoSansDevanagari_600SemiBold
} from '@expo-google-fonts/noto-sans-devanagari';
import {
    DMSans_400Regular,
    DMSans_500Medium,
    DMSans_600SemiBold,
    DMSans_700Bold
} from '@expo-google-fonts/dm-sans';
import { Lora_400Regular_Italic } from '@expo-google-fonts/lora';
import { View } from 'react-native';

// Screens
import SplashScreenComponent from './src/screens/SplashScreen';
import LanguageSelectionScreen from './src/screens/LanguageSelectionScreen';
import LoginScreen from './src/screens/LoginScreen';
import OTPVerificationScreen from './src/screens/OTPVerificationScreen';
import IdentityVerificationScreen from './src/screens/IdentityVerificationScreen';
import ProfileSetupScreen from './src/screens/ProfileSetupScreen';
import HomeScreen from './src/screens/HomeScreen';
import CropsScreen from './src/screens/CropsScreen';
import WeatherScreen from './src/screens/WeatherScreen';
import SchemesScreen from './src/screens/SchemesScreen';
import MarketScreen from './src/screens/MarketScreen';
import EmergencyScreen from './src/screens/EmergencyScreen';
import FasalDocScreen from './src/screens/FasalDocScreen';
import HumBoloScreen from './src/screens/HumBoloScreen';
import ProfileScreen from './src/screens/ProfileScreen';

const Stack = createNativeStackNavigator();
const Tab = createBottomTabNavigator();

// GramVikash app-specific nav items (matching green design)
// GramVikash app-specific nav items (matching green design)
const TAB_CONFIG = [
    {
        name: 'Home',
        label: 'होम',
        icon: 'home-outline',
        iconFocused: 'home',
        component: HomeScreen,
    },
    {
        name: 'Weather',
        label: 'मौसम',
        icon: 'cloud-outline',
        iconFocused: 'cloud',
        component: WeatherScreen,
    },
    {
        name: 'Market',
        label: 'बाज़ार',
        icon: 'stats-chart-outline',
        iconFocused: 'stats-chart',
        component: MarketScreen,
    },
    {
        name: 'Crops',
        label: 'फसल',
        icon: 'leaf-outline',
        iconFocused: 'leaf',
        component: CropsScreen,
    },
    {
        name: 'Schemes',
        label: 'सलाह',
        icon: 'bulb-outline',
        iconFocused: 'bulb',
        component: SchemesScreen,
    },
];

import { translations } from './src/utils/translations';
import { useFarmerStore } from './src/store';

function MainTabNavigator() {
    const { language = 'hi' } = useFarmerStore();
    const t = translations[language] || translations['hi'];

    return (
        <Tab.Navigator
            screenOptions={({ route }) => {
                const config = TAB_CONFIG.find((t) => t.name === route.name);
                return {
                    headerShown: false,
                    tabBarShowLabel: true,
                    tabBarActiveTintColor: '#ffffff',
                    tabBarInactiveTintColor: '#ffffff',
                    tabBarStyle: {
                        position: 'absolute',
                        left: 0,
                        right: 0,
                        backgroundColor: 'transparent',
                        height: 75,
                        borderTopWidth: 0,
                        elevation: 0,
                        shadowOpacity: 0,
                        zIndex: 1000,
                    },
                    tabBarBackground: () => (
                        <View
                            style={{
                                flex: 1,
                                backgroundColor: '#4a7543',
                                marginHorizontal: 0,
                            }}
                        />
                    ),
                    tabBarItemStyle: {
                        paddingHorizontal: 2,
                    },
                    tabBarLabelStyle: {
                        fontFamily: 'NotoSansDevanagari_400Regular',
                        fontSize: 12,
                        marginTop: 4,
                        textAlign: 'center',
                    },
                    tabBarIcon: ({ focused, color }) => {
                        const iconName = focused ? config?.iconFocused : config?.icon;
                        return (
                            <Ionicons
                                name={iconName}
                                size={24}
                                color={color}
                            />
                        );
                    },
                };
            }}
        >
            {TAB_CONFIG.map((tab) => {
                // Determine localized label
                let label = tab.label;
                if (tab.name === 'Home') label = t.navHome;
                else if (tab.name === 'Weather') label = t.navWeather;
                else if (tab.name === 'Market') label = t.navMarket;
                else if (tab.name === 'Crops') label = t.navCrops;
                else if (tab.name === 'Schemes') label = t.navSchemes;

                return (
                    <Tab.Screen
                        key={tab.name}
                        name={tab.name}
                        component={tab.component}
                        options={{ tabBarLabel: label }}
                    />
                );
            })}
        </Tab.Navigator>
    );
}

const MyTheme = {
    ...DefaultTheme,
    colors: {
        ...DefaultTheme.colors,
        primary: '#4a7543',
        background: 'transparent',
        card: 'transparent',
        text: '#1a2e0a',
        border: 'transparent',
        notification: '#4a7543',
    },
    fonts: DefaultTheme.fonts, // Use default v7 fonts to avoid undefined.regular
};

export default function App() {
    const [fontsLoaded, fontError] = useFonts({
        PlayfairDisplay_700Bold,
        PlayfairDisplay_600SemiBold,
        NotoSansDevanagari_400Regular,
        NotoSansDevanagari_500Medium,
        NotoSansDevanagari_600SemiBold,
        DMSans_400Regular,
        DMSans_500Medium,
        DMSans_600SemiBold,
        DMSans_700Bold,
        Lora_400Regular_Italic,
    });

    const onLayoutRootView = useCallback(() => { }, []);

    return (
        <View style={{ flex: 1, backgroundColor: '#faf7f1' }} onLayout={onLayoutRootView}>
            <NavigationContainer theme={MyTheme}>
                <Stack.Navigator
                    screenOptions={{ headerShown: false }}
                    initialRouteName="Splash"
                >
                    {/* Intro Flow */}
                    <Stack.Screen name="Splash" component={SplashScreenComponent} />
                    <Stack.Screen name="LanguageSelect" component={LanguageSelectionScreen} />

                    {/* Auth Flow */}
                    <Stack.Screen name="Login" component={LoginScreen} />
                    <Stack.Screen name="OTPVerification" component={OTPVerificationScreen} />
                    <Stack.Screen name="IdentityVerification" component={IdentityVerificationScreen} />
                    <Stack.Screen name="ProfileSetup" component={ProfileSetupScreen} />

                    {/* Main App */}
                    <Stack.Screen name="MainTabs" component={MainTabNavigator} />
                    <Stack.Screen name="FasalDoc" component={FasalDocScreen} />
                    <Stack.Screen name="Emergency" component={EmergencyScreen} />
                    <Stack.Screen name="HumBolo" component={HumBoloScreen} />
                    <Stack.Screen name="Profile" component={ProfileScreen} />
                </Stack.Navigator>
            </NavigationContainer>
        </View>
    );
}