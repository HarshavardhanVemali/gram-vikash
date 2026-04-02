import { Platform } from 'react-native';
import { initializeApp, getApps, getApp } from 'firebase/app';
import { initializeAuth, getReactNativePersistence, getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import ReactNativeAsyncStorage from '@react-native-async-storage/async-storage';
import { API_KEYS } from '../constants/apiKeys';

let auth;
let isNativeAuth = false;

const firebaseConfig = {
    apiKey: API_KEYS.FIREBASE_API_KEY,
    authDomain: API_KEYS.FIREBASE_AUTH_DOMAIN,
    projectId: API_KEYS.FIREBASE_PROJECT_ID,
    storageBucket: API_KEYS.FIREBASE_STORAGE_BUCKET,
    messagingSenderId: API_KEYS.FIREBASE_MESSAGING_SENDER_ID,
    appId: API_KEYS.FIREBASE_APP_ID,
    measurementId: API_KEYS.FIREBASE_MEASUREMENT_ID
};

// Always initialize the web SDK app (used for Firestore, etc.)
const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();

let signInWithPhoneNumberInternal;
let confirmInternal;
let signOutInternal;
let db;

if (Platform.OS === 'web') {
    try {
        auth = initializeAuth(app);
    } catch (e) {
        auth = getAuth(app);
    }
    const webAuth = require('firebase/auth');
    signInWithPhoneNumberInternal = (phoneNumber, recaptchaVerifier) =>
        webAuth.signInWithPhoneNumber(auth, phoneNumber, recaptchaVerifier);
    confirmInternal = (confirmationResult, code) => confirmationResult.confirm(code);
    signOutInternal = () => webAuth.signOut(auth);
    db = getFirestore(app);
} else {
    // Native (iOS/Android): use @react-native-firebase/auth v22 modular API
    try {
        const {
            getAuth: getAuthNative,
            signInWithPhoneNumber: nativeSignIn,
            signOut: nativeSignOut
        } = require('@react-native-firebase/auth');

        const nativeAuth = getAuthNative();
        auth = nativeAuth;
        isNativeAuth = true;

        // Native modular SDK takes (auth, phoneNumber)
        signInWithPhoneNumberInternal = (phoneNumber) => nativeSignIn(nativeAuth, phoneNumber);

        // modular: confirmationResult.confirm(code)
        confirmInternal = (confirmationResult, code) => {
            if (confirmationResult && typeof confirmationResult.confirm === 'function') {
                return confirmationResult.confirm(code);
            }
            throw new Error('Firebase: confirmationResult.confirm is not a function');
        };

        signOutInternal = () => nativeSignOut(nativeAuth);

        const firestoreModule = require('@react-native-firebase/firestore');
        db = firestoreModule.default ? firestoreModule.default() : firestoreModule();

        console.log('Firebase: Using Native SDK (v22 modular)');
    } catch (e) {
        // Fallback: Web JS SDK with React Native persistence (Expo Go)
        console.log('Firebase: Native SDK not found, falling back to Web JS SDK');
        try {
            auth = initializeAuth(app, {
                persistence: getReactNativePersistence(ReactNativeAsyncStorage)
            });
        } catch (err) {
            auth = getAuth(app);
        }
        const webAuth = require('firebase/auth');
        signInWithPhoneNumberInternal = (phoneNumber, recaptchaVerifier) =>
            webAuth.signInWithPhoneNumber(auth, phoneNumber, recaptchaVerifier);
        confirmInternal = (confirmationResult, code) => {
            if (confirmationResult && typeof confirmationResult.confirm === 'function') {
                return confirmationResult.confirm(code);
            }
            throw new Error('Firebase Web: confirm() not found');
        };
        signOutInternal = () => webAuth.signOut(auth);
        db = getFirestore(app);
    }
}

export {
    auth,
    isNativeAuth,
    signInWithPhoneNumberInternal as signInWithPhoneNumber,
    confirmInternal as confirm,
    signOutInternal as signOut,
    db,
};
