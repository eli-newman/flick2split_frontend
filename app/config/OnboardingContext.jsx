import { createContext, useCallback, useContext, useEffect, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

const STORAGE_KEY = 'onboardingComplete';
const OnboardingContext = createContext(null);

export function OnboardingProvider({ children }) {
  const [onboardingDone, setOnboardingDone] = useState(null); // null = not yet checked

  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY).then((val) => {
      setOnboardingDone(val === 'true');
    });
  }, []);

  // Synchronous in-memory flip so navigation guards don't race the AsyncStorage write.
  const completeOnboarding = useCallback(async () => {
    setOnboardingDone(true);
    try {
      await AsyncStorage.setItem(STORAGE_KEY, 'true');
    } catch (e) {
      console.warn('Failed to persist onboardingComplete:', e);
    }
  }, []);

  return (
    <OnboardingContext.Provider value={{ onboardingDone, completeOnboarding }}>
      {children}
    </OnboardingContext.Provider>
  );
}

export function useOnboarding() {
  const ctx = useContext(OnboardingContext);
  if (!ctx) throw new Error('useOnboarding must be used inside OnboardingProvider');
  return ctx;
}
