import { useEffect } from 'react';
import { Slot, useRouter, useSegments } from 'expo-router';
import { AuthProvider, useAuth } from './config/AuthContext';
import { OnboardingProvider, useOnboarding } from './config/OnboardingContext';
import { SignUpSheetProvider } from './auth/SignUpSheetContext';

function AuthGate() {
  const { user, loading } = useAuth();
  const { onboardingDone } = useOnboarding();
  const segments = useSegments();
  const router = useRouter();

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
  }, [user, loading, segments, onboardingDone, router]);

  return <Slot />;
}

export default function RootLayout() {
  return (
    <AuthProvider>
      <OnboardingProvider>
        <SignUpSheetProvider>
          <AuthGate />
        </SignUpSheetProvider>
      </OnboardingProvider>
    </AuthProvider>
  );
}
