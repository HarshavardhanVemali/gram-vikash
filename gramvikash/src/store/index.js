import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import * as SecureStore from 'expo-secure-store';
import AsyncStorage from '@react-native-async-storage/async-storage';// --- SecureStore Adapter for Auth ---
const secureStorage = {
    getItem: async (name) => {
        return (await SecureStore.getItemAsync(name)) || null;
    },
    setItem: async (name, value) => {
        await SecureStore.setItemAsync(name, value);
    },
    removeItem: async (name) => {
        await SecureStore.deleteItemAsync(name);
    },
};

export const useAuthStore = create(
    persist(
        (set) => ({
            tokens: null,
            confirmationResult: null, // Transient: holds Firebase confirmation result
            phoneNumber: null, // Transient: holds phone number for verification context
            login: (tokens) => set({ tokens }),
            logout: () => set({ tokens: null }),
            refreshTokens: (newTokens) => set({ tokens: newTokens }),
            setConfirmationResult: (result) => set({ confirmationResult: result }),
            setPhoneNumber: (phone) => set({ phoneNumber: phone }),
            clearOtpSession: () => set({ confirmationResult: null, phoneNumber: null }),
        }),
        {
            name: 'auth-storage',
            storage: createJSONStorage(() => secureStorage),
            partialize: (state) => ({ tokens: state.tokens }), // Only persist tokens
        }
    )
);

// --- AsyncStorage Adapter for Farmer Profile ---
const storageProvider = AsyncStorage;

export const useFarmerStore = create(
    persist(
        (set) => ({
            farmer: null,
            language: 'hi', // Top-level language field for translations
            setFarmer: (farmer) => set({ farmer }),
            setLanguage: (lang) => set({ language: lang }),
            updateLanguage: (language_preference) =>
                set((state) => ({
                    language: language_preference,
                    farmer: { ...state.farmer, language_preference },
                })),
            markDigiLockerLinked: (name) =>
                set((state) => ({
                    farmer: {
                        ...state.farmer,
                        digilocker_linked: true,
                        digilocker_aadhaar_name: name
                    }
                })),
        }),
        {
            name: 'farmer-storage',
            storage: createJSONStorage(() => storageProvider),
        }
    )
);
