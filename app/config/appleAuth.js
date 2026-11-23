import {
  OAuthProvider,
  linkWithCredential,
  signInWithCredential,
} from 'firebase/auth';
import {
  doc,
  serverTimestamp,
  writeBatch,
} from 'firebase/firestore';
import { auth, db } from './firebase';

// Lazy require so the JS bundle doesn't crash on dev builds that haven't been
// re-prebuilt to include these native modules yet.
let AppleAuthentication = null;
let Crypto = null;
function loadAppleAuth() {
  if (AppleAuthentication !== null) return AppleAuthentication;
  try {
    AppleAuthentication = require('expo-apple-authentication');
  } catch (e) {
    AppleAuthentication = false;
  }
  return AppleAuthentication;
}
function loadCrypto() {
  if (Crypto !== null) return Crypto;
  try {
    Crypto = require('expo-crypto');
  } catch (e) {
    Crypto = false;
  }
  return Crypto;
}

const BYTES_TO_BASE64 = (bytes) => {
  let binary = '';
  for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i]);
  if (typeof btoa === 'function') return btoa(binary);
  return Buffer.from(binary, 'binary').toString('base64');
};

async function generateNoncePair() {
  const crypto = loadCrypto();
  if (!crypto) throw makeError('apple/unavailable', 'expo-crypto native module is not linked');
  const random = await crypto.getRandomBytesAsync(32);
  const rawNonce = BYTES_TO_BASE64(random)
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
  const hashedNonce = await crypto.digestStringAsync(
    crypto.CryptoDigestAlgorithm.SHA256,
    rawNonce,
    { encoding: crypto.CryptoEncoding.HEX }
  );
  return { rawNonce, hashedNonce };
}

function buildDisplayName(fullName) {
  if (!fullName) return null;
  const parts = [fullName.givenName, fullName.familyName].filter(Boolean);
  return parts.length ? parts.join(' ') : null;
}

function makeError(code, message, extra = {}) {
  const err = new Error(message);
  err.code = code;
  Object.assign(err, extra);
  return err;
}

export async function isAppleAuthAvailable() {
  const mod = loadAppleAuth();
  if (!mod) return false;
  try {
    return await mod.isAvailableAsync();
  } catch (e) {
    console.warn('Apple auth check failed:', e?.message || e);
    return false;
  }
}

export async function signInWithApple() {
  const mod = loadAppleAuth();
  if (!mod) {
    throw makeError('apple/unavailable', 'Apple Sign-In native module is not linked. Rebuild the app.');
  }
  const available = await mod.isAvailableAsync().catch(() => false);
  if (!available) {
    throw makeError('apple/unavailable', 'Apple Sign-In is not available on this device');
  }

  const { rawNonce, hashedNonce } = await generateNoncePair();

  let appleCredential;
  try {
    appleCredential = await mod.signInAsync({
      requestedScopes: [
        mod.AppleAuthenticationScope.FULL_NAME,
        mod.AppleAuthenticationScope.EMAIL,
      ],
      nonce: hashedNonce,
    });
  } catch (e) {
    if (e?.code === 'ERR_REQUEST_CANCELED') {
      throw makeError('apple/cancelled', 'User cancelled Apple Sign-In');
    }
    throw makeError(e?.code || 'apple/unknown', e?.message || 'Apple Sign-In failed');
  }

  const { identityToken, fullName, email } = appleCredential;
  if (!identityToken) {
    throw makeError('apple/no-identity-token', 'Apple did not return an identity token');
  }

  const provider = new OAuthProvider('apple.com');
  const credential = provider.credential({ idToken: identityToken, rawNonce });

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
        'apple/credential-conflict',
        'This Apple ID is already linked to another account',
        { existingAppleCredential: credential, anonymousUser: currentUser }
      );
    }
    throw makeError(e?.code || 'apple/sign-in-failed', e?.message || 'Firebase sign-in failed');
  }

  const user = userCredential.user;
  const displayName = buildDisplayName(fullName) || user.displayName || null;
  const resolvedEmail = email || user.email || null;

  // Apple returns fullName + email ONLY on the first sign-in; persist them atomically.
  try {
    const batch = writeBatch(db);
    batch.set(
      doc(db, 'users', user.uid),
      {
        email: resolvedEmail,
        displayName,
        signedUpAt: serverTimestamp(),
        authMethod: 'apple',
        isAnonymous: false,
      },
      { merge: true }
    );
    await batch.commit();
  } catch (e) {
    console.error('Apple profile write failed:', {
      code: e?.code,
      message: e?.message,
      uid: user.uid,
    });
    throw makeError(
      'apple/profile-write-failed',
      'Failed to persist Apple profile after sign-in'
    );
  }

  return {
    user,
    isNewUser: !!fullName,
    mergedFromAnonymous: wasAnonymous,
  };
}

export default { signInWithApple, isAppleAuthAvailable };
