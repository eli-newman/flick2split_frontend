import { useEffect, useState } from 'react';
import { Slot, useRouter, useSegments } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { AuthProvider, useAuth } from './config/AuthContext';

function AuthGate() {
  const { user, loading } = useAuth();
  const segments = useSegments();
  const router = useRouter();
  const [onboardingDone, setOnboardingDone] = useState(null); // null = not yet checked

  useEffect(() => {
    AsyncStorage.getItem('onboardingComplete').then((val) => {
      setOnboardingDone(val === 'true');
    });
  }, []);

  useEffect(() => {
    if (loading || onboardingDone === null) return;

    const inAuthGroup = segments[0] === '(auth)';
    const inOnboarding = segments[0] === 'onboarding';

    // First-launch: show onboarding before anything else
    if (!onboardingDone && !inOnboarding) {
      router.replace('/onboarding');
      return;
    }

    // Anonymous users are "signed in" — let them visit auth pages to upgrade
    if (user?.isAnonymous) return;

    if (!user && !inAuthGroup) {
      router.replace('/(auth)/sign-in');
    } else if (user && inAuthGroup) {
      router.replace('/');
    }
  }, [user, loading, segments, onboardingDone]);

  // Initialize RevenueCat — only for real (non-anonymous) users in production builds
  useEffect(() => {
    if (!user || user.isAnonymous) return;

    let teardown = () => {};
    let cancelled = false;

    (async () => {
      try {
        const { initPurchases } = require('./config/purchases');
        await initPurchases(user.uid);
        if (cancelled) return;
        // Firestore isPremium is server-managed: written only by the RevenueCat
        // webhook Cloud Function via the Admin SDK. Clients cannot mirror that
        // field — Firestore rules forbid it — so we no longer attach a listener
        // that tried to. UI that needs immediate feedback can read RevenueCat's
        // customerInfo.entitlements directly.
      } catch (e) {
        // react-native-purchases not available in Expo Go — skip
        console.log('RevenueCat init skipped:', e.message);
      }
    })();

    return () => {
      cancelled = true;
      try { teardown(); } catch (_e) { /* noop */ }
    };
  }, [user]);

  return <Slot />;
}

export default function RootLayout() {
  return (
    <AuthProvider>
      <AuthGate />
    </AuthProvider>
  );
}
