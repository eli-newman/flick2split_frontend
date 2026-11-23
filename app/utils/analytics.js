import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../config/firebase';

/**
 * Log an analytics event to Firestore.
 * Writes to users/{uid}/events — queryable from Firebase console / BigQuery.
 * Never throws — analytics failures must not block the user.
 */
export const logEvent = async (uid, eventName, params = {}) => {
  if (!uid || !eventName) return;
  try {
    await addDoc(collection(db, 'users', uid, 'events'), {
      event: eventName,
      ...params,
      timestamp: serverTimestamp(),
    });
  } catch (e) {
    console.warn('[analytics] logEvent failed', { eventName, uid, code: e?.code, message: e?.message });
  }
};

export const logAuthPromptShown = (uid, surface, methodsOffered) =>
  logEvent(uid, 'auth_prompt_shown', { surface, methods_offered: methodsOffered });

export const logAuthPromptAccepted = (uid, surface, method, latencyMs) =>
  logEvent(uid, 'auth_prompt_accepted', { surface, method, latency_ms: latencyMs });

export const logAuthPromptDismissed = (uid, surface, reason) =>
  logEvent(uid, 'auth_prompt_dismissed', { surface, reason });

export const logAuthSignupSucceeded = (uid, method, surface, latencyMs) =>
  logEvent(uid, 'auth_signup_succeeded', { method, surface, latency_ms: latencyMs });

export const logAuthSignupFailed = (uid, method, surface, errorCode) =>
  logEvent(uid, 'auth_signup_failed', { method, surface, error_code: errorCode || 'unknown' });
