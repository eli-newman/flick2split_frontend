import AsyncStorage from '@react-native-async-storage/async-storage';
import { logEvent } from './analytics';

const COUNT_KEY = 'splitsCompletedCount';
const LAST_PROMPT_KEY = 'lastReviewPromptDate';
const MIN_SPLITS_BEFORE_PROMPT = 2;
const MIN_DAYS_BETWEEN_PROMPTS = 120;

/**
 * Best-effort in-app review prompt after a successful split.
 *
 * Gates (all must pass):
 *  - splitsCompletedCount >= 2 (skip first split — it could be exploratory)
 *  - lastReviewPromptDate empty OR > 120 days ago (Apple caps at 3 per 365 days)
 *  - StoreReview.isAvailableAsync() === true
 *  - StoreReview.hasAction() === true
 *
 * Lazy-requires `expo-store-review` so Expo Go / web don't crash if the
 * native module is unavailable. Never throws — wrapped in try/catch.
 *
 * @param {string|undefined} uid - Firebase Auth uid for analytics logging
 */
export async function maybePromptForReview(uid) {
  try {
    // Always increment the completion counter
    const countStr = await AsyncStorage.getItem(COUNT_KEY);
    const count = parseInt(countStr || '0', 10) + 1;
    await AsyncStorage.setItem(COUNT_KEY, String(count));

    // Gate: need at least one prior successful split as warm-up
    if (count < MIN_SPLITS_BEFORE_PROMPT) {
      logEvent(uid, 'review_prompt_skipped', { reason: 'low_split_count', count });
      return;
    }

    // Gate: don't prompt if we asked recently
    const lastStr = await AsyncStorage.getItem(LAST_PROMPT_KEY);
    if (lastStr) {
      const lastMs = Date.parse(lastStr);
      if (!Number.isNaN(lastMs)) {
        const daysSince = (Date.now() - lastMs) / (1000 * 60 * 60 * 24);
        if (daysSince < MIN_DAYS_BETWEEN_PROMPTS) {
          logEvent(uid, 'review_prompt_skipped', { reason: 'too_recent', days_since: daysSince });
          return;
        }
      }
    }

    // Lazy-require so missing module doesn't crash the app (e.g. Expo Go / web)
    let StoreReview;
    try {
      StoreReview = require('expo-store-review');
    } catch {
      logEvent(uid, 'review_prompt_skipped', { reason: 'not_available' });
      return;
    }

    const available = await StoreReview.isAvailableAsync();
    if (!available) {
      logEvent(uid, 'review_prompt_skipped', { reason: 'not_available' });
      return;
    }

    const hasAction = await StoreReview.hasAction();
    if (!hasAction) {
      logEvent(uid, 'review_prompt_skipped', { reason: 'not_available' });
      return;
    }

    logEvent(uid, 'review_prompt_eligible', { count });
    await StoreReview.requestReview();
    await AsyncStorage.setItem(LAST_PROMPT_KEY, new Date().toISOString());
  } catch {
    // silent — review prompt is best-effort, must never block the user
  }
}
