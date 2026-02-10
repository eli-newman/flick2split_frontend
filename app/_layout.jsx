import { useEffect } from 'react';
import { Slot, useRouter, useSegments } from 'expo-router';
import { AuthProvider, useAuth } from './config/AuthContext';

function AuthGate() {
  const { user, loading } = useAuth();
  const segments = useSegments();
  const router = useRouter();

  useEffect(() => {
    if (loading) return;

    const inAuthGroup = segments[0] === '(auth)';

    if (!user && !inAuthGroup) {
      router.replace('/(auth)/sign-in');
    } else if (user && inAuthGroup) {
      router.replace('/');
    }
  }, [user, loading, segments]);

  // Initialize RevenueCat after auth (only in production builds)
  useEffect(() => {
    if (!user) return;

    (async () => {
      try {
        const { initPurchases } = require('./config/purchases');
        await initPurchases(user.uid);
      } catch (e) {
        // react-native-purchases not available in Expo Go — skip
        console.log('RevenueCat init skipped:', e.message);
      }
    })();
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
