import { useEffect, useState } from 'react';
import {
  Text, View, TextInput, TouchableOpacity, StyleSheet,
  KeyboardAvoidingView, Platform, ActivityIndicator, Dimensions,
  Animated, Alert, ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { SafeAreaView } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  sendPasswordResetEmail,
} from 'firebase/auth';
import { doc, setDoc, serverTimestamp } from 'firebase/firestore';
import { auth, db } from '../config/firebase';
import { signInWithApple, isAppleAuthAvailable } from '../config/appleAuth';
import { signInWithGoogle, isGoogleAuthAvailable } from '../config/googleAuth';

const { width } = Dimensions.get('window');

export default function SignIn() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [venmoUsername, setVenmoUsername] = useState('');
  const [isSignUp, setIsSignUp] = useState(false);
  const [loading, setLoading] = useState(false);
  const [socialBusy, setSocialBusy] = useState(null); // 'apple' | 'google' | null
  const [error, setError] = useState('');
  const [appleAvailable, setAppleAvailable] = useState(false);
  const [googleAvailable, setGoogleAvailable] = useState(false);

  useEffect(() => {
    let cancelled = false;
    isAppleAuthAvailable().then((ok) => {
      if (!cancelled) setAppleAvailable(ok && Platform.OS === 'ios');
    });
    isGoogleAuthAvailable().then((ok) => {
      if (!cancelled) setGoogleAvailable(!!ok);
    });
    return () => { cancelled = true; };
  }, []);

  const handleApple = async () => {
    setError('');
    setSocialBusy('apple');
    try {
      await signInWithApple();
      // AuthGate handles navigation
    } catch (e) {
      if (e?.code !== 'apple/cancelled') {
        setError(socialMessageFor(e));
      }
      setSocialBusy(null);
    }
  };

  const handleGoogle = async () => {
    setError('');
    setSocialBusy('google');
    try {
      await signInWithGoogle();
    } catch (e) {
      if (e?.code !== 'google/cancelled') {
        setError(socialMessageFor(e));
      }
      setSocialBusy(null);
    }
  };

  const currentMonth = () => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  };

  const handleForgotPassword = async () => {
    if (!email) {
      setError('Please enter your email address first.');
      return;
    }
    try {
      await sendPasswordResetEmail(auth, email);
      Alert.alert('Password Reset', 'Check your email for a password reset link.');
    } catch (err) {
      const messages = {
        'auth/invalid-email': 'Please enter a valid email address.',
        'auth/user-not-found': 'No account found with this email.',
      };
      setError(messages[err.code] || err.message);
    }
  };

  const handleAuth = async () => {
    if (!email || !password) {
      setError('Please enter both email and password.');
      return;
    }
    if (password.length < 6) {
      setError('Password must be at least 6 characters.');
      return;
    }

    setLoading(true);
    setError('');

    try {
      if (isSignUp) {
        const { user } = await createUserWithEmailAndPassword(auth, email, password);
        // Create user profile in Firestore
        await setDoc(doc(db, 'users', user.uid), {
          email: user.email,
          displayName: '',
          venmoUsername: venmoUsername.trim() || '',
          createdAt: serverTimestamp(),
          isPremium: false,
          premiumType: null,
          scanCount: 0,
          scanResetDate: currentMonth(),
          scanCredits: 0,
          freeScansUsed: 0,
        });
      } else {
        await signInWithEmailAndPassword(auth, email, password);
      }
      // AuthGate in _layout.jsx handles navigation
    } catch (err) {
      const messages = {
        'auth/email-already-in-use': 'An account with this email already exists.',
        'auth/invalid-email': 'Please enter a valid email address.',
        'auth/wrong-password': 'Incorrect password. Please try again.',
        'auth/user-not-found': 'No account found with this email.',
        'auth/invalid-credential': 'Invalid email or password.',
        'auth/too-many-requests': 'Too many attempts. Please try again later.',
      };
      setError(messages[err.code] || err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <LinearGradient
        colors={['#3442C6', '#5B42E8', '#7451FB', '#8360FF']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={StyleSheet.absoluteFillObject}
      />
      <SafeAreaView style={styles.safeArea}>
        <StatusBar style="light" />
        <KeyboardAvoidingView
          style={styles.container}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        >
          {/* Title */}
          <View style={styles.header}>
            <View style={styles.titleContainer}>
              <Text style={styles.title}>FLICK</Text>
              <Text style={styles.yellowText}>2</Text>
              <Text style={styles.title}>SPLIT</Text>
            </View>
            <Text style={styles.tagline}>The best way to split with friends</Text>
          </View>

          {/* Form */}
          <ScrollView
            style={styles.formScroll}
            contentContainerStyle={styles.formContainer}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            <Text style={styles.formTitle}>
              {isSignUp ? 'Create Account' : 'Welcome Back'}
            </Text>

            {appleAvailable && (
              <TouchableOpacity
                style={[styles.appleButton, socialBusy === 'apple' && styles.buttonBusy]}
                onPress={handleApple}
                disabled={!!socialBusy || loading}
                activeOpacity={0.85}
              >
                {socialBusy === 'apple' ? (
                  <ActivityIndicator color="white" />
                ) : (
                  <>
                    <Ionicons name="logo-apple" size={20} color="white" style={{ marginRight: 8 }} />
                    <Text style={styles.appleButtonText}>Continue with Apple</Text>
                  </>
                )}
              </TouchableOpacity>
            )}

            {googleAvailable && (
              <TouchableOpacity
                style={[styles.googleButton, socialBusy === 'google' && styles.buttonBusy]}
                onPress={handleGoogle}
                disabled={!!socialBusy || loading}
                activeOpacity={0.85}
              >
                {socialBusy === 'google' ? (
                  <ActivityIndicator color="#1F1F1F" />
                ) : (
                  <>
                    <Ionicons name="logo-google" size={20} color="#1F1F1F" style={{ marginRight: 8 }} />
                    <Text style={styles.googleButtonText}>Continue with Google</Text>
                  </>
                )}
              </TouchableOpacity>
            )}

            {(appleAvailable || googleAvailable) && (
              <View style={styles.dividerRow}>
                <View style={styles.dividerLine} />
                <Text style={styles.dividerText}>or</Text>
                <View style={styles.dividerLine} />
              </View>
            )}

            <TextInput
              style={styles.input}
              placeholder="Email"
              placeholderTextColor="rgba(255, 255, 255, 0.5)"
              value={email}
              onChangeText={setEmail}
              autoCapitalize="none"
              keyboardType="email-address"
              textContentType="emailAddress"
            />

            <TextInput
              style={styles.input}
              placeholder="Password"
              placeholderTextColor="rgba(255, 255, 255, 0.5)"
              value={password}
              onChangeText={setPassword}
              secureTextEntry
              textContentType={isSignUp ? 'newPassword' : 'password'}
            />

            {isSignUp && (
              <TextInput
                style={styles.input}
                placeholder="@ Venmo Username (optional)"
                placeholderTextColor="rgba(255, 255, 255, 0.5)"
                value={venmoUsername}
                onChangeText={(text) => setVenmoUsername(text.replace(/^@/, ''))}
                autoCapitalize="none"
                autoCorrect={false}
              />
            )}

            {error ? <Text style={styles.errorText}>{error}</Text> : null}

            <TouchableOpacity
              style={styles.authButton}
              onPress={handleAuth}
              disabled={loading}
              activeOpacity={0.8}
            >
              {loading ? (
                <ActivityIndicator color="#3442C6" />
              ) : (
                <Text style={styles.authButtonText}>
                  {isSignUp ? 'Sign Up' : 'Sign In'}
                </Text>
              )}
            </TouchableOpacity>

            {!isSignUp && (
              <TouchableOpacity
                onPress={handleForgotPassword}
                style={styles.forgotButton}
              >
                <Text style={styles.forgotText}>Forgot Password?</Text>
              </TouchableOpacity>
            )}

            <TouchableOpacity
              onPress={() => {
                setIsSignUp(!isSignUp);
                setError('');
              }}
              style={styles.switchButton}
            >
              <Text style={styles.switchText}>
                {isSignUp
                  ? 'Already have an account? Sign In'
                  : "Don't have an account? Sign Up"}
              </Text>
            </TouchableOpacity>
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  container: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: 30,
  },
  header: {
    alignItems: 'center',
    marginBottom: 50,
  },
  titleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  title: {
    fontSize: 50,
    fontWeight: '900',
    color: 'white',
    textShadowColor: 'rgba(0, 0, 0, 0.69)',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 10,
    letterSpacing: 1.5,
  },
  yellowText: {
    fontSize: 60,
    fontWeight: '900',
    color: '#FFDF00',
    textShadowColor: 'rgba(0, 0, 0, 0.74)',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 10,
    letterSpacing: 1.5,
  },
  tagline: {
    fontSize: 18,
    color: 'white',
    opacity: 0.9,
    textAlign: 'center',
    fontWeight: '500',
    textShadowColor: 'rgba(0, 0, 0, 0.74)',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 5,
  },
  formScroll: {
    maxHeight: '85%',
    flexGrow: 0,
  },
  formContainer: {
    backgroundColor: 'rgba(255, 255, 255, 0.12)',
    borderRadius: 24,
    padding: 28,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  appleButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'black',
    borderRadius: 14,
    paddingVertical: 14,
    marginBottom: 10,
    minHeight: 50,
  },
  appleButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  googleButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'white',
    borderRadius: 14,
    paddingVertical: 14,
    marginBottom: 10,
    minHeight: 50,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.25)',
  },
  googleButtonText: {
    color: '#1F1F1F',
    fontSize: 16,
    fontWeight: '600',
  },
  buttonBusy: { opacity: 0.7 },
  dividerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 14,
  },
  dividerLine: {
    flex: 1,
    height: StyleSheet.hairlineWidth,
    backgroundColor: 'rgba(255, 255, 255, 0.35)',
  },
  dividerText: {
    color: 'rgba(255, 255, 255, 0.7)',
    fontSize: 12,
    fontWeight: '600',
    marginHorizontal: 10,
    letterSpacing: 1,
  },
  formTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: 'white',
    textAlign: 'center',
    marginBottom: 24,
  },
  input: {
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    borderRadius: 16,
    padding: 16,
    fontSize: 16,
    color: 'white',
    marginBottom: 14,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.25)',
  },
  errorText: {
    color: '#FF6B6B',
    fontSize: 14,
    textAlign: 'center',
    marginBottom: 12,
    fontWeight: '500',
  },
  authButton: {
    backgroundColor: 'white',
    borderRadius: 30,
    paddingVertical: 16,
    alignItems: 'center',
    marginTop: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 5,
  },
  authButtonText: {
    fontSize: 18,
    fontWeight: '800',
    color: '#3442C6',
  },
  forgotButton: {
    marginTop: 14,
    alignItems: 'center',
  },
  forgotText: {
    color: 'rgba(255, 255, 255, 0.7)',
    fontSize: 14,
    fontWeight: '500',
  },
  switchButton: {
    marginTop: 20,
    alignItems: 'center',
  },
  switchText: {
    color: 'rgba(255, 255, 255, 0.85)',
    fontSize: 15,
    fontWeight: '500',
  },
});

function socialMessageFor(e) {
  const code = e?.code || '';
  const map = {
    'apple/unavailable': 'Sign in with Apple is not available on this device.',
    'apple/credential-conflict': 'This Apple ID is already linked to another account.',
    'apple/profile-write-failed': 'Signed in, but we couldn\'t save your profile. Please try again.',
    'google/unavailable': 'Sign in with Google is not available on this device.',
    'google/play-services-unavailable': 'Google Play Services is required for Google Sign-In.',
    'google/credential-conflict': 'This Google account is already linked to another account.',
    'google/profile-write-failed': 'Signed in, but we couldn\'t save your profile. Please try again.',
    'google/no-id-token': 'Google didn\'t return a token. Please try again.',
    'auth/network-request-failed': 'Network error. Check your connection and try again.',
  };
  return map[code] || 'Sign-in failed. Please try again.';
}
