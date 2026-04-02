import React from 'react';
import { BackHandler, Alert } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';

/**
 * Hook to handle hardware back press on Android.
 * If onBackPress is not provided, it defaults to showing an exit confirmation alert.
 */
export const useBackHandler = (onBackPress) => {
    useFocusEffect(
        React.useCallback(() => {
            const handleBackPress = () => {
                if (onBackPress) {
                    return onBackPress();
                }

                Alert.alert(
                    'Exit App',
                    'Do you want to exit the app?',
                    [
                        { text: 'Cancel', onPress: () => null, style: 'cancel' },
                        { text: 'Exit', onPress: () => BackHandler.exitApp() },
                    ],
                    { cancelable: false }
                );
                return true;
            };

            const subscription = BackHandler.addEventListener('hardwareBackPress', handleBackPress);

            return () => subscription.remove();
        }, [onBackPress])
    );
};
