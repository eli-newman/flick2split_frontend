import { useEffect, useRef, useState } from 'react';
import {
  Modal, View, Text, TouchableOpacity, TextInput, StyleSheet, Platform,
  ActivityIndicator, Animated, Easing, KeyboardAvoidingView, ScrollView,
  TouchableWithoutFeedback, Keyboard,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import {
  EmailAuthProvider, linkWithCredential, signInWithEmailAndPassword,
} from 'firebase/auth';
import { doc, serverTimestamp, writeBatch } from 'firebase/firestore';
import { auth, db } from '../config/firebase';
import { signInWithApple, isAppleAuthAvailable } from '../config/appleAuth';
import { signInWithGoogle, isGoogleAuthAvailable } from '../config/googleAuth';
import { useAuth } from '../config/AuthContext';
import {
  logAuthPromptShown, logAuthPromptDismissed, logAuthPromptAccepted,
  logAuthSignupSucceeded, logAuthSignupFailed,
} from '../utils/analytics';

const PRIMARY = '#3442C6';
const DANGER = '#E53935';

export default function SignUpSheet({ visible, surface, title, subtitle, onClose }) {
  const { user } = useAuth();
  const [mode, setMode] = useState('chooser'); // 'chooser' | 'email'
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(null); // 'apple' | 'google' | 'email' | null
  const [error, setError] = useState('');
  const [appleAvailable, setAppleAvailable] = useState(false);
  const [googleAvailable, setGoogleAvailable] = useState(false);

  const promptShownAtRef = useRef(0);
  const translateY = useRef(new Animated.Value(600)).current;
  const backdropOpacity = useRef(new Animated.Value(0)).current;

  // Probe provider availability once when the sheet first becomes visible.
  useEffect(() => {
    if (!visible) return;
    let cancelled = false;
    isAppleAuthAvailable().then((ok) => {
      if (!cancelled) setAppleAvailable(ok && Platform.OS === 'ios');
    });
    isGoogleAuthAvailable().then((ok) => {
      if (!cancelled) setGoogleAvailable(!!ok);
    });
    return () => { cancelled = true; };
  }, [visible]);

  // Animate in / out + log prompt impression.
  useEffect(() => {
    if (visible) {
      promptShownAtRef.current = Date.now();
      setMode('chooser');
      setEmail('');
      setPassword('');
      setError('');
      setBusy(null);
      const offered = [];
      if (appleAvailable) offered.push('apple');
      if (googleAvailable) offered.push('google');
      offered.push('email');
      logAuthPromptShown(user?.uid, surface, offered);
      Animated.parallel([
        Animated.timing(backdropOpacity, {
          toValue: 1, duration: 220, useNativeDriver: true, easing: Easing.out(Easing.quad),
        }),
        Animated.timing(translateY, {
          toValue: 0, duration: 320, useNativeDriver: true, easing: Easing.out(Easing.cubic),
        }),
      ]).start();
    } else {
      Animated.parallel([
        Animated.timing(backdropOpacity, {
          toValue: 0, duration: 180, useNativeDriver: true,
        }),
        Animated.timing(translateY, {
          toValue: 600, duration: 220, useNativeDriver: true, easing: Easing.in(Easing.cubic),
        }),
      ]).start();
    }
    // We intentionally don't include user/surface/appleAvailable beyond visible —
    // the prompt analytics should fire exactly once per open.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible]);

  const dismiss = (reason) => {
    logAuthPromptDismissed(user?.uid, surface, reason);
    onClose({ success: false });
  };

  const handleApple = async () => {
    setError('');
    setBusy('apple');
    const startedAt = Date.now();
    try {
      const { user: signedInUser } = await signInWithApple();
      const latency = Date.now() - promptShownAtRef.current;
      logAuthPromptAccepted(signedInUser.uid, surface, 'apple', latency);
      logAuthSignupSucceeded(signedInUser.uid, 'apple', surface, Date.now() - startedAt);
      onClose({ success: true });
    } catch (e) {
      if (e?.code === 'apple/cancelled') {
        setBusy(null);
        return;
      }
      logAuthSignupFailed(user?.uid, 'apple', surface, e?.code);
      setError(messageFor(e));
      setBusy(null);
    }
  };

  const handleGoogle = async () => {
    setError('');
    setBusy('google');
    const startedAt = Date.now();
    try {
      const { user: signedInUser } = await signInWithGoogle();
      const latency = Date.now() - promptShownAtRef.current;
      logAuthPromptAccepted(signedInUser.uid, surface, 'google', latency);
      logAuthSignupSucceeded(signedInUser.uid, 'google', surface, Date.now() - startedAt);
      onClose({ success: true });
    } catch (e) {
      if (e?.code === 'google/cancelled') {
        setBusy(null);
        return;
      }
      logAuthSignupFailed(user?.uid, 'google', surface, e?.code);
      setError(messageFor(e));
      setBusy(null);
    }
  };

  const handleEmailSubmit = async () => {
    setError('');
    if (!email.trim() || !password) {
      setError('Enter your email and a password.');
      return;
    }
    if (password.length < 6) {
      setError('Password must be at least 6 characters.');
      return;
    }
    setBusy('email');
    const startedAt = Date.now();
    try {
      const signedInUser = await upgradeAnonymousWithEmail(email.trim(), password);
      const latency = Date.now() - promptShownAtRef.current;
      logAuthPromptAccepted(signedInUser.uid, surface, 'email', latency);
      logAuthSignupSucceeded(signedInUser.uid, 'email', surface, Date.now() - startedAt);
      onClose({ success: true });
    } catch (e) {
      logAuthSignupFailed(user?.uid, 'email', surface, e?.code);
      setError(messageFor(e));
      setBusy(null);
    }
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="none"
      onRequestClose={() => dismiss('system_back')}
      statusBarTranslucent
    >
      <View style={styles.root}>
        <TouchableWithoutFeedback onPress={() => !busy && dismiss('tapped_backdrop')}>
          <Animated.View style={[styles.backdrop, { opacity: backdropOpacity }]} />
        </TouchableWithoutFeedback>

        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={styles.keyboardWrap}
          pointerEvents="box-none"
        >
          <Animated.View style={[styles.sheet, { transform: [{ translateY }] }]}>
            <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
              <View>
                <View style={styles.handle} />
                <TouchableOpacity
                  style={styles.closeButton}
                  onPress={() => !busy && dismiss('tapped_close')}
                  hitSlop={12}
                >
                  <Ionicons name="close" size={22} color="#999" />
                </TouchableOpacity>

                <ScrollView
                  keyboardShouldPersistTaps="handled"
                  contentContainerStyle={styles.body}
                  showsVerticalScrollIndicator={false}
                >
                  <View style={styles.iconBubble}>
                    <Ionicons name="diamond" size={28} color={PRIMARY} />
                  </View>
                  <Text style={styles.title}>{title}</Text>
                  <Text style={styles.subtitle}>{subtitle}</Text>

                  {mode === 'chooser' ? (
                    <>
                      {appleAvailable && (
                        <TouchableOpacity
                          style={[styles.appleButton, busy === 'apple' && styles.buttonBusy]}
                          onPress={handleApple}
                          disabled={!!busy}
                          activeOpacity={0.85}
                        >
                          {busy === 'apple' ? (
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
                          style={[styles.googleButton, busy === 'google' && styles.buttonBusy]}
                          onPress={handleGoogle}
                          disabled={!!busy}
                          activeOpacity={0.85}
                        >
                          {busy === 'google' ? (
                            <ActivityIndicator color="#1F1F1F" />
                          ) : (
                            <>
                              <Ionicons name="logo-google" size={20} color="#1F1F1F" style={{ marginRight: 8 }} />
                              <Text style={styles.googleButtonText}>Continue with Google</Text>
                            </>
                          )}
                        </TouchableOpacity>
                      )}

                      <TouchableOpacity
                        style={styles.secondaryLink}
                        onPress={() => setMode('email')}
                        disabled={!!busy}
                      >
                        <Text style={styles.secondaryLinkText}>
                          {appleAvailable || googleAvailable ? 'Use email instead' : 'Sign up with email'}
                        </Text>
                      </TouchableOpacity>
                    </>
                  ) : (
                    <>
                      <TextInput
                        style={styles.input}
                        placeholder="Email"
                        placeholderTextColor="#999"
                        value={email}
                        onChangeText={setEmail}
                        autoCapitalize="none"
                        keyboardType="email-address"
                        textContentType="emailAddress"
                        editable={!busy}
                      />
                      <TextInput
                        style={styles.input}
                        placeholder="Password (6+ characters)"
                        placeholderTextColor="#999"
                        value={password}
                        onChangeText={setPassword}
                        secureTextEntry
                        textContentType="newPassword"
                        editable={!busy}
                      />
                      <TouchableOpacity
                        style={[styles.primaryButton, busy === 'email' && styles.buttonBusy]}
                        onPress={handleEmailSubmit}
                        disabled={!!busy}
                        activeOpacity={0.85}
                      >
                        {busy === 'email' ? (
                          <ActivityIndicator color="white" />
                        ) : (
                          <Text style={styles.primaryButtonText}>Create account</Text>
                        )}
                      </TouchableOpacity>
                      {(appleAvailable || googleAvailable) && (
                        <TouchableOpacity
                          style={styles.secondaryLink}
                          onPress={() => setMode('chooser')}
                          disabled={!!busy}
                        >
                          <Text style={styles.secondaryLinkText}>Back to options</Text>
                        </TouchableOpacity>
                      )}
                    </>
                  )}

                  {!!error && <Text style={styles.error}>{error}</Text>}

                  <Text style={styles.fineprint}>
                    By continuing, you agree to our Terms and Privacy Policy.
                  </Text>
                </ScrollView>
              </View>
            </TouchableWithoutFeedback>
          </Animated.View>
        </KeyboardAvoidingView>
      </View>
    </Modal>
  );
}

// Atomic anonymous→email upgrade. Falls back to a normal sign-in when the email
// already has an account (the anonymous shell is discarded; merging across UIDs
// is a separate flow — see the merge guardrail sub-idea in the plan).
async function upgradeAnonymousWithEmail(email, password) {
  const current = auth.currentUser;
  const credential = EmailAuthProvider.credential(email, password);

  let userCred;
  try {
    if (current?.isAnonymous) {
      userCred = await linkWithCredential(current, credential);
    } else {
      userCred = await signInWithEmailAndPassword(auth, email, password);
    }
  } catch (e) {
    if (e?.code === 'auth/email-already-in-use' && current?.isAnonymous) {
      userCred = await signInWithEmailAndPassword(auth, email, password);
    } else {
      throw e;
    }
  }

  const u = userCred.user;
  const batch = writeBatch(db);
  batch.set(
    doc(db, 'users', u.uid),
    {
      email: u.email,
      signedUpAt: serverTimestamp(),
      authMethod: 'email',
      isAnonymous: false,
    },
    { merge: true }
  );
  await batch.commit();
  return u;
}

function messageFor(e) {
  const code = e?.code || '';
  const map = {
    'auth/email-already-in-use': 'An account already exists for this email. Try signing in instead.',
    'auth/invalid-email': 'Please enter a valid email address.',
    'auth/weak-password': 'Choose a stronger password (6+ characters).',
    'auth/wrong-password': 'Incorrect password. Please try again.',
    'auth/user-not-found': 'No account found with this email.',
    'auth/invalid-credential': 'Invalid email or password.',
    'auth/too-many-requests': 'Too many attempts. Please try again in a moment.',
    'auth/network-request-failed': 'Network error. Check your connection and try again.',
    'apple/unavailable': 'Sign in with Apple is not available on this device.',
    'apple/credential-conflict': 'This Apple ID is already linked to another Flick2Split account.',
    'apple/profile-write-failed': 'Signed in, but we couldn\'t save your profile. Please try again.',
    'google/unavailable': 'Sign in with Google is not available on this device.',
    'google/cancelled': 'Sign-in cancelled.',
    'google/play-services-unavailable': 'Google Play Services is required for Google Sign-In.',
    'google/credential-conflict': 'This Google account is already linked to another Flick2Split account.',
    'google/profile-write-failed': 'Signed in, but we couldn\'t save your profile. Please try again.',
    'google/no-id-token': 'Google didn\'t return a token. Please try again.',
  };
  return map[code] || 'Something went wrong. Please try again.';
}

const styles = StyleSheet.create({
  root: { flex: 1, justifyContent: 'flex-end' },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  keyboardWrap: { width: '100%' },
  sheet: {
    backgroundColor: 'white',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingTop: 12,
    paddingBottom: 36,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -8 },
    shadowOpacity: 0.2,
    shadowRadius: 24,
    elevation: 24,
  },
  handle: {
    alignSelf: 'center',
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#E0E0E0',
    marginBottom: 8,
  },
  closeButton: {
    position: 'absolute',
    top: 18,
    right: 18,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#F2F2F2',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1,
  },
  body: {
    paddingHorizontal: 24,
    paddingTop: 8,
    paddingBottom: 4,
  },
  iconBubble: {
    width: 56,
    height: 56,
    borderRadius: 16,
    backgroundColor: 'rgba(52, 66, 198, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
    alignSelf: 'flex-start',
  },
  title: {
    fontSize: 22,
    fontWeight: '800',
    color: '#1A1A1A',
    marginBottom: 6,
    letterSpacing: -0.3,
  },
  subtitle: {
    fontSize: 15,
    color: '#666',
    lineHeight: 21,
    marginBottom: 24,
  },
  appleButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'black',
    borderRadius: 14,
    paddingVertical: 16,
    marginBottom: 12,
    minHeight: 54,
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
    paddingVertical: 16,
    marginBottom: 12,
    minHeight: 54,
    borderWidth: 1,
    borderColor: '#E0E0E0',
  },
  googleButtonText: {
    color: '#1F1F1F',
    fontSize: 16,
    fontWeight: '600',
  },
  primaryButton: {
    backgroundColor: PRIMARY,
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: 'center',
    minHeight: 54,
    justifyContent: 'center',
    marginTop: 4,
  },
  primaryButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '700',
  },
  buttonBusy: { opacity: 0.7 },
  secondaryLink: {
    paddingVertical: 12,
    alignItems: 'center',
  },
  secondaryLinkText: {
    color: PRIMARY,
    fontSize: 15,
    fontWeight: '600',
  },
  input: {
    backgroundColor: '#F4F4F6',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 16,
    color: '#1A1A1A',
    marginBottom: 12,
  },
  error: {
    color: DANGER,
    fontSize: 14,
    textAlign: 'center',
    marginTop: 12,
  },
  fineprint: {
    fontSize: 11,
    color: '#999',
    textAlign: 'center',
    marginTop: 20,
    lineHeight: 16,
  },
});
