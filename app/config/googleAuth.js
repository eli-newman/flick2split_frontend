import {
  GoogleAuthProvider,
  linkWithCredential,
  signInWithCredential,
} from 'firebase/auth';
import {
  doc,
  serverTimestamp,
  writeBatch,
} from 'firebase/firestore';
import { Platform } from 'react-native';
import Constants from 'expo-constants';
import { auth, db } from './firebase';

let GoogleSignin = null;
let statusCodes = null;
let isSuccessResponse = null;
let configured = false;

function loadGoogleSignin() {
  if (GoogleSignin !== null) return GoogleSignin;
  try {
    const mod = require('@react-native-google-signin/google-signin');
    GoogleSignin = mod.GoogleSignin;
    statusCodes = mod.statusCodes;
    isSuccessResponse = mod.isSuccessResponse;
  } catch (e) {
    GoogleSignin = false;
  }
  return GoogleSignin;
}

function makeError(code, message, extra = {}) {
  const err = new Error(message);
  err.code = code;
  Object.assign(err, extra);
  return err;
}

function ensureConfigured() {
  if (configured) return;
  const mod = loadGoogleSignin();
  if (!mod) {
    throw makeError(
      'google/unavailable',
      'Google Sign-In native module is not linked. Rebuild the app.'
    );
  }
  const extra = Constants.expoConfig?.extra || {};
  const iosClientId =
    extra.googleIosClientId ||
    process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID ||
    null;
  const webClientId =
    extra.googleWebClientId ||
    process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID ||
    null;

  if (Platform.OS === 'ios' && !iosClientId) {
    throw makeError(
      'google/unavailable',
      'Google iOS client ID not configured. Set EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID.'
    );
  }

  mod.configure({
    iosClientId: iosClientId || undefined,
    webClientId: webClientId || undefined,
  });
  configured = true;
}

export async function isGoogleAuthAvailable() {
  const mod = loadGoogleSignin();
  if (!mod) return false;
  try {
    ensureConfigured();
  } catch (e) {
    return false;
  }
  if (Platform.OS === 'android') {
    try {
      await mod.hasPlayServices({ showPlayServicesUpdateDialog: false });
      return true;
    } catch {
      return false;
    }
  }
  return true;
}

export async function signInWithGoogle() {
  ensureConfigured();
  const mod = loadGoogleSignin();

  if (Platform.OS === 'android') {
    try {
      await mod.hasPlayServices({ showPlayServicesUpdateDialog: true });
    } catch (e) {
      throw makeError(
        'google/play-services-unavailable',
        'Google Play Services unavailable on this device'
      );
    }
  }

  let response;
  try {
    response = await mod.signIn();
  } catch (e) {
    const code = e?.code;
    if (
      code === statusCodes?.SIGN_IN_CANCELLED ||
      code === '-5' /* iOS cancel */
    ) {
      throw makeError('google/cancelled', 'User cancelled Google Sign-In');
    }
    if (code === statusCodes?.IN_PROGRESS) {
      throw makeError('google/in-progress', 'A Google Sign-In is already in progress');
    }
    if (code === statusCodes?.PLAY_SERVICES_NOT_AVAILABLE) {
      throw makeError('google/play-services-unavailable', 'Google Play Services unavailable');
    }
    throw makeError(code || 'google/unknown', e?.message || 'Google Sign-In failed');
  }

  // v13+ wraps in { type: 'success' | 'cancelled', data }.
  // Older versions return { idToken, user } directly. Handle both.
  let payload = null;
  if (isSuccessResponse && isSuccessResponse(response)) {
    payload = response.data;
  } else if (response?.type === 'success') {
    payload = response.data;
  } else if (response?.type === 'cancelled') {
    throw makeError('google/cancelled', 'User cancelled Google Sign-In');
  } else if (response?.idToken || response?.user) {
    payload = response;
  } else {
    throw makeError('google/unknown', 'Unexpected Google Sign-In response shape');
  }

  const idToken = payload?.idToken;
  if (!idToken) {
    throw makeError('google/no-id-token', 'Google did not return an idToken');
  }

  const profile = payload.user || {};
  const googleEmail = profile.email || null;
  const googleName = profile.name || null;
  const googlePhoto = profile.photo || null;

  const credential = GoogleAuthProvider.credential(idToken);

  const currentUser = auth.currentUser;
  const wasAnonymous = !!currentUser?.isAnonymous;

  let userCredential;
  try {
    if (wasAnonymous) {
      userCredential = await linkWithCredential(currentUser, credential);
    } else {
      userCredential = await signInWithCredential(auth, credential);
    }
  } catch (e) {
    if (e?.code === 'auth/credential-already-in-use') {
      throw makeError(
        'google/credential-conflict',
        'This Google account is already linked to another account',
        { existingGoogleCredential: credential, anonymousUser: currentUser }
      );
    }
    throw makeError(
      e?.code || 'google/sign-in-failed',
      e?.message || 'Firebase sign-in failed'
    );
  }

  const user = userCredential.user;
  const resolvedEmail = googleEmail || user.email || null;
  const resolvedName = googleName || user.displayName || null;
  const resolvedPhoto = googlePhoto || user.photoURL || null;

  try {
    const batch = writeBatch(db);
    batch.set(
      doc(db, 'users', user.uid),
      {
        email: resolvedEmail,
        displayName: resolvedName,
        photoURL: resolvedPhoto,
        signedUpAt: serverTimestamp(),
        authMethod: 'google',
        isAnonymous: false,
      },
      { merge: true }
    );
    await batch.commit();
  } catch (e) {
    console.error('Google profile write failed:', {
      code: e?.code,
      message: e?.message,
      uid: user.uid,
    });
    throw makeError(
      'google/profile-write-failed',
      'Failed to persist Google profile after sign-in'
    );
  }

  return {
    user,
    isNewUser: !!googleName,
    mergedFromAnonymous: wasAnonymous,
  };
}

export async function signOutGoogle() {
  const mod = loadGoogleSignin();
  if (!mod || !configured) return;
  try {
    await mod.signOut();
  } catch {
    // ignore — Firebase signOut is the source of truth
  }
}

export default { signInWithGoogle, isGoogleAuthAvailable, signOutGoogle };
