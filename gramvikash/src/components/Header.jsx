import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { COLORS } from '../colors';

export default function Header({ title }) {
    return (
        <View style={styles.container}>
            <Text style={styles.title}>{title}</Text>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        height: 60,
        backgroundColor: COLORS.PRIMARY,
        justifyContent: 'center',
        paddingHorizontal: 16,
    },
    title: {
        color: COLORS.CARD,
        fontSize: 20,
        fontWeight: 'bold',
    },
});
