import { Platform } from 'react-native';
import Purchases from 'react-native-purchases';

const IOS_KEY = process.env.EXPO_PUBLIC_REVENUECAT_IOS_KEY;
const ANDROID_KEY = process.env.EXPO_PUBLIC_REVENUECAT_ANDROID_KEY;

export const ENTITLEMENT_ID = 'flick2split Premium';

let configured = false;

export async function initPurchases(userId) {
  if (configured) return;

  const apiKey = Platform.OS === 'ios' ? IOS_KEY : ANDROID_KEY;
  if (!apiKey) {
    console.warn('RevenueCat: no API key for', Platform.OS);
    return;
  }
  if (apiKey.startsWith('sk_')) {
    throw new Error('RevenueCat: refusing to use a secret key in the client bundle');
  }
  // Production builds must never ship with a test_ key — those route to
  // RevenueCat's mock store and silently break real purchases on the App Store.
  if (!__DEV__ && apiKey.startsWith('test_')) {
    throw new Error(
      'RevenueCat: test_ API key detected in a production build. ' +
      'Set EXPO_PUBLIC_REVENUECAT_IOS_KEY / _ANDROID_KEY to the appl_ / goog_ keys before shipping.'
    );
  }

  Purchases.configure({ apiKey, appUserID: userId });
  configured = true;
}

export function isConfigured() {
  return configured;
}

export async function getOfferings() {
  if (!configured) return null;
  try {
    const offerings = await Purchases.getOfferings();
    return offerings.current ?? null;
  } catch (e) {
    console.warn('RevenueCat getOfferings error:', e);
    return null;
  }
}

export async function purchasePackage(pkg) {
  const { customerInfo } = await Purchases.purchasePackage(pkg);
  return customerInfo;
}

export async function purchaseProduct(productId) {
  const products = await Purchases.getProducts([productId]);
  if (!products || products.length === 0) {
    throw new Error(`Product ${productId} not found`);
  }
  const { customerInfo } = await Purchases.purchaseStoreProduct(products[0]);
  return customerInfo;
}

export async function restorePurchases() {
  const customerInfo = await Purchases.restorePurchases();
  return customerInfo;
}

export async function getCustomerInfo() {
  if (!configured) return null;
  try {
    return await Purchases.getCustomerInfo();
  } catch (e) {
    console.warn('RevenueCat getCustomerInfo error:', e);
    return null;
  }
}

export function hasPremiumEntitlement(customerInfo) {
  if (!customerInfo) return false;
  return typeof customerInfo.entitlements?.active?.[ENTITLEMENT_ID] !== 'undefined';
}

export function addCustomerInfoUpdateListener(callback) {
  Purchases.addCustomerInfoUpdateListener(callback);
  return () => Purchases.removeCustomerInfoUpdateListener(callback);
}

export async function presentPaywall() {
  if (!configured) return false;
  const RevenueCatUI = require('react-native-purchases-ui').default;
  const { PAYWALL_RESULT } = require('react-native-purchases-ui');
  const result = await RevenueCatUI.presentPaywall();
  return result === PAYWALL_RESULT.PURCHASED || result === PAYWALL_RESULT.RESTORED;
}

export async function presentPaywallIfNeeded() {
  if (!configured) return false;
  const RevenueCatUI = require('react-native-purchases-ui').default;
  const { PAYWALL_RESULT } = require('react-native-purchases-ui');
  const result = await RevenueCatUI.presentPaywallIfNeeded({
    requiredEntitlementIdentifier: ENTITLEMENT_ID,
  });
  return result === PAYWALL_RESULT.PURCHASED || result === PAYWALL_RESULT.RESTORED;
}
