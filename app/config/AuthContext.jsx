import { createContext, useContext, useState, useEffect } from 'react';
import { onAuthStateChanged, signInAnonymously } from 'firebase/auth';
import { doc, onSnapshot, setDoc, serverTimestamp } from 'firebase/firestore';
import { auth, db } from './firebase';

const AuthContext = createContext(null);

const currentMonth = () => {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
};

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [userProfile, setUserProfile] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribeAuth = onAuthStateChanged(auth, (firebaseUser) => {
      if (firebaseUser) {
        setUser(firebaseUser);
      } else {
        // Auto sign-in anonymously so users can use the app without creating an account
        signInAnonymously(auth).catch((e) => {
          console.error('Anonymous sign-in failed:', e);
          setUser(null);
          setUserProfile(null);
          setLoading(false);
        });
      }
    });
    return unsubscribeAuth;
  }, []);

  // Listen to user profile document in Firestore
  useEffect(() => {
    if (!user) return;

    const unsubscribeProfile = onSnapshot(
      doc(db, 'users', user.uid),
      async (snapshot) => {
        if (snapshot.exists()) {
          setUserProfile(snapshot.data());
          setLoading(false);
        } else if (user.isAnonymous) {
          // Auto-create a minimal profile for anonymous users so Cloud Functions
          // can find the user document before the first scan
          try {
            await setDoc(doc(db, 'users', user.uid), {
              isAnonymous: true,
              isPremium: false,
              scanCount: 0,
              scanResetDate: currentMonth(),
              scanCredits: 0,
              freeScansUsed: 0,
              createdAt: serverTimestamp(),
            });
            // onSnapshot fires again once the doc is created
          } catch (e) {
            console.error('Failed to create anonymous user profile:', e);
            setLoading(false);
          }
        } else {
          setUserProfile(null);
          setLoading(false);
        }
      },
      (error) => {
        console.error('Error listening to user profile:', error);
        setLoading(false);
      }
    );

    return unsubscribeProfile;
  }, [user]);

  return (
    <AuthContext.Provider value={{ user, userProfile, loading }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
