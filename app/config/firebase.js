import { initializeApp } from 'firebase/app';
import { initializeAuth, getReactNativePersistence, getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getFunctions } from 'firebase/functions';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';

const firebaseConfig = {
  apiKey: "AIzaSyBoPKeGy5FyK5JKhZAHyAQC5dDyRmH7TAo",
  authDomain: "abiding-envoy-448410-u4.firebaseapp.com",
  projectId: "abiding-envoy-448410-u4",
  storageBucket: "abiding-envoy-448410-u4.firebasestorage.app",
  messagingSenderId: "777817822240",
  appId: "1:777817822240:ios:0522be8ff112b7abc05845",
};

const app = initializeApp(firebaseConfig);

// getReactNativePersistence is only available in the React Native bundle,
// not on web. Use getAuth as fallback for web.
let auth;
if (Platform.OS === 'web' || typeof getReactNativePersistence !== 'function') {
  auth = getAuth(app);
} else {
  auth = initializeAuth(app, {
    persistence: getReactNativePersistence(AsyncStorage),
  });
}

export { auth };
export const db = getFirestore(app);
export const functions = getFunctions(app);

export default app;
