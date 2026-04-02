import React, { useRef, useEffect } from 'react';
import { View, Animated, StyleSheet } from 'react-native';

/**
 * A single animated skeleton shimmer box.
 * Props: width, height, borderRadius, style
 */
export function SkeletonBox({ width = '100%', height = 20, borderRadius = 10, style }) {
    const shimmer = useRef(new Animated.Value(0)).current;

    useEffect(() => {
        const loop = Animated.loop(
            Animated.sequence([
                Animated.timing(shimmer, { toValue: 1, duration: 900, useNativeDriver: true }),
                Animated.timing(shimmer, { toValue: 0, duration: 900, useNativeDriver: true }),
            ])
        );
        loop.start();
        return () => loop.stop();
    }, []);

    const opacity = shimmer.interpolate({ inputRange: [0, 1], outputRange: [0.4, 1] });

    return (
        <Animated.View
            style={[
                { width, height, borderRadius, backgroundColor: '#e2e8f0', opacity },
                style,
            ]}
        />
    );
}

/**
 * Skeleton layout for the HomeScreen weather card.
 */
export function HomeScreenSkeleton() {
    return (
        <View style={styles.homeWrapper}>
            {/* Weather card skeleton */}
            <View style={styles.card}>
                <View style={styles.row}>
                    <View style={{ flex: 1, gap: 10 }}>
                        <SkeletonBox width={80} height={14} borderRadius={7} />
                        <SkeletonBox width={60} height={56} borderRadius={10} />
                        <SkeletonBox width={120} height={12} borderRadius={6} />
                        <SkeletonBox width={160} height={28} borderRadius={8} />
                    </View>
                    <SkeletonBox width={90} height={90} borderRadius={45} style={{ marginLeft: 16 }} />
                </View>
            </View>

            {/* HumBolo card skeleton */}
            <View style={[styles.card, styles.row, { marginTop: 12, padding: 20 }]}>
                <SkeletonBox width={56} height={56} borderRadius={28} />
                <View style={{ marginLeft: 16, flex: 1, gap: 8 }}>
                    <SkeletonBox width={'70%'} height={18} borderRadius={8} />
                    <SkeletonBox width={'50%'} height={13} borderRadius={6} />
                </View>
            </View>

            {/* Mid row skeleton */}
            <View style={[styles.row, { marginTop: 12, gap: 12 }]}>
                <View style={[styles.card, { flex: 1.6, padding: 16, gap: 8 }]}>
                    <SkeletonBox width={44} height={44} borderRadius={12} />
                    <SkeletonBox width={'60%'} height={16} borderRadius={7} />
                    <SkeletonBox width={'80%'} height={12} borderRadius={6} />
                </View>
                <View style={[styles.card, { flex: 1, padding: 16, gap: 8, alignItems: 'center' }]}>
                    <SkeletonBox width={44} height={44} borderRadius={22} />
                    <SkeletonBox width={80} height={13} borderRadius={6} />
                </View>
            </View>
        </View>
    );
}

/**
 * Skeleton layout for the WeatherScreen.
 */
export function WeatherScreenSkeleton() {
    return (
        <View style={styles.weatherWrapper}>
            {/* Location */}
            <View style={[styles.row, { justifyContent: 'center', marginBottom: 20 }]}>
                <SkeletonBox width={16} height={16} borderRadius={8} style={{ marginRight: 8 }} />
                <SkeletonBox width={160} height={18} borderRadius={8} />
            </View>

            {/* Big temp */}
            <View style={{ alignItems: 'center', marginBottom: 24 }}>
                <SkeletonBox width={160} height={110} borderRadius={16} style={{ marginBottom: 12 }} />
                <SkeletonBox width={120} height={22} borderRadius={10} />
            </View>

            {/* Metrics row */}
            <View style={[styles.row, { justifyContent: 'space-around', marginBottom: 24 }]}>
                {[0, 1, 2, 3].map(i => (
                    <View key={i} style={{ alignItems: 'center', gap: 8 }}>
                        <SkeletonBox width={40} height={40} borderRadius={20} />
                        <SkeletonBox width={44} height={12} borderRadius={6} />
                        <SkeletonBox width={32} height={16} borderRadius={7} />
                    </View>
                ))}
            </View>

            {/* Advisory card */}
            <View style={[styles.card, { padding: 16, gap: 10, marginBottom: 24 }]}>
                <SkeletonBox width={140} height={18} borderRadius={8} />
                <SkeletonBox width={'100%'} height={13} borderRadius={6} />
                <SkeletonBox width={'80%'} height={13} borderRadius={6} />
            </View>

            {/* Forecast chips */}
            <SkeletonBox width={120} height={14} borderRadius={7} style={{ marginBottom: 16 }} />
            <View style={styles.row}>
                {[0, 1, 2, 3, 4].map(i => (
                    <View key={i} style={[styles.card, { width: 75, height: 120, marginRight: 12, alignItems: 'center', justifyContent: 'space-around', padding: 12 }]}>
                        <SkeletonBox width={44} height={12} borderRadius={5} />
                        <SkeletonBox width={36} height={36} borderRadius={18} />
                        <SkeletonBox width={36} height={16} borderRadius={7} />
                    </View>
                ))}
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    homeWrapper: {
        paddingHorizontal: 0,
        paddingTop: 4,
    },
    weatherWrapper: {
        paddingHorizontal: 14,
        paddingTop: 8,
    },
    card: {
        backgroundColor: '#ffffff',
        borderRadius: 22,
        borderWidth: 1.3,
        borderColor: '#e2e8f0',
        padding: 20,
    },
    row: {
        flexDirection: 'row',
        alignItems: 'center',
    },
});
