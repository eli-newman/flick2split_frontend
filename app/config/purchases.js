import { Platform } from 'react-native';
import Constants from 'expo-constants';

const REVENUECAT_API_KEY_IOS = 'sk_WnjnASbbQjNOiKRNQLavDBIdrOvZW';
const REVENUECAT_API_KEY_ANDROID = 'sk_WnjnASbbQjNOiKRNQLavDBIdrOvZW';

let isInitialized = false;

// Skip RevenueCat entirely in Expo Go
const isExpoGo = Constants.appOwnership === 'expo';

export async function initPurchases(uid) {
  if (isInitialized || isExpoGo) return;

  try {
    const Purchases = require('react-native-purchases').default;
    const apiKey = Platform.OS === 'ios' ? REVENUECAT_API_KEY_IOS : REVENUECAT_API_KEY_ANDROID;
    Purchases.configure({ apiKey, appUserID: uid });
    isInitialized = true;
  } catch (error) {
    console.log('RevenueCat configure skipped:', error.message);
  }
}

export async function getOfferings() {
  if (isExpoGo) return null;
  try {
    const Purchases = require('react-native-purchases').default;
    const offerings = await Purchases.getOfferings();
    return offerings.current;
  } catch (error) {
    console.error('Error fetching offerings:', error);
    return null;
  }
}

export async function purchasePackage(pkg) {
  if (isExpoGo) throw new Error('Purchases not available in Expo Go');
  const Purchases = require('react-native-purchases').default;
  try {
    const { customerInfo } = await Purchases.purchasePackage(pkg);
    return customerInfo;
  } catch (error) {
    if (!error.userCancelled) {
      console.error('Purchase error:', error);
    }
    throw error;
  }
}

export async function restorePurchases() {
  if (isExpoGo) throw new Error('Purchases not available in Expo Go');
  const Purchases = require('react-native-purchases').default;
  try {
    const customerInfo = await Purchases.restorePurchases();
    return customerInfo;
  } catch (error) {
    console.error('Restore error:', error);
    throw error;
  }
}
