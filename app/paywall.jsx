import { useState, useEffect, useRef } from 'react';
import {
  Text, View, TouchableOpacity, StyleSheet, ActivityIndicator, Alert, ScrollView, Linking, SafeAreaView,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { StatusBar } from 'expo-status-bar';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { getOfferings, purchasePackage, restorePurchases } from './config/purchases';
import { useAuth } from './config/AuthContext';
import { logEvent } from './utils/analytics';

const TERMS_URL = 'https://flick2split.com/terms';
const PRIVACY_URL = 'https://flick2split.com/privacy';

export default function Paywall() {
  const router = useRouter();
  const { user } = useAuth();
  const params = useLocalSearchParams();
  const trigger = (typeof params?.trigger === 'string' && params.trigger) || 'unknown';

  const [offerings, setOfferings] = useState(null);
  const [loading, setLoading] = useState(true);
  const [purchasing, setPurchasing] = useState(null);

  // Track whether we've logged paywall_dismissed already so back-press +
  // unmount don't both fire it.
  const dismissedRef = useRef(false);
  const uidRef = useRef(user?.uid);
  uidRef.current = user?.uid;

  // Redirect anonymous users to sign-in. They can technically land here from
  // the scan-limit path; we want a real account before charging them.
  useEffect(() => {
    if (user?.isAnonymous) {
      Alert.alert('Sign in to upgrade', 'Please create an account or sign in to purchase Premium.', [
        { text: 'OK', onPress: () => router.replace('/(auth)/sign-in') },
      ]);
    }
  }, [user, router]);

  // Log paywall_shown once on mount; paywall_dismissed once on unmount.
  useEffect(() => {
    logEvent(user?.uid, 'paywall_shown', { trigger });
    return () => {
      if (!dismissedRef.current) {
        dismissedRef.current = true;
        logEvent(uidRef.current, 'paywall_dismissed', { trigger });
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    loadOfferings();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const loadOfferings = async () => {
    const current = await getOfferings();
    setOfferings(current);
    setLoading(false);

    const pkgs = current?.availablePackages;
    if (!pkgs || pkgs.length === 0) {
      logEvent(user?.uid, 'paywall_offering_missing', { trigger });
    } else {
      logEvent(user?.uid, 'paywall_offering_loaded', {
        package_count: pkgs.length,
        currency_code: pkgs[0]?.product?.currencyCode || null,
        trigger,
      });
    }
  };

  const dismiss = () => {
    if (!dismissedRef.current) {
      dismissedRef.current = true;
      logEvent(uidRef.current, 'paywall_dismissed', { trigger });
    }
    router.back();
  };

  const handlePurchase = async (pkg) => {
    if (!pkg) return;
    setPurchasing(pkg.identifier);
    logEvent(user?.uid, 'paywall_purchase_initiated', { package_id: pkg.identifier, trigger });
    try {
      await purchasePackage(pkg);
      // Server-only path: RevenueCat webhook → Cloud Function → Firestore writes
      // isPremium. Firestore rules forbid client writes to that field so we can't
      // optimistically mirror it here. The webhook typically fires within 1–3s.
      logEvent(user?.uid, 'paywall_purchase_succeeded', { package_id: pkg.identifier, trigger });
      Alert.alert('Welcome to Premium!', 'You now have unlimited scans.', [
        { text: 'OK', onPress: () => router.back() },
      ]);
    } catch (error) {
      logEvent(user?.uid, 'paywall_purchase_failed', {
        package_id: pkg.identifier,
        error_code: error?.code || error?.userInfo?.readableErrorCode || 'unknown',
        user_cancelled: !!error?.userCancelled,
        trigger,
      });
      if (!error?.userCancelled) {
        Alert.alert('Purchase Failed', 'Please try again later.');
      }
    } finally {
      setPurchasing(null);
    }
  };

  const handleRestore = async () => {
    logEvent(user?.uid, 'paywall_restore_attempted', { trigger });
    try {
      const customerInfo = await restorePurchases();
      const active = customerInfo?.entitlements?.active || {};
      const hasActive = Object.keys(active).length > 0;

      if (hasActive) {
        // Webhook will reconcile Firestore. Client cannot write isPremium directly.
        logEvent(user?.uid, 'paywall_restore_succeeded', { trigger });
        Alert.alert('Restored', 'Your purchases have been restored.', [
          { text: 'OK', onPress: () => router.back() },
        ]);
      } else {
        logEvent(user?.uid, 'paywall_restore_failed', { trigger, reason: 'no_active_entitlements' });
        Alert.alert('No previous purchases', 'We didn\'t find any purchases on this account.');
      }
    } catch (error) {
      const code = error?.code || error?.userInfo?.readableErrorCode;
      const msg = (error?.message || '').toLowerCase();
      const isNetwork =
        code === 'NETWORK_ERROR' ||
        code === 'unavailable' ||
        msg.includes('network') ||
        msg.includes('connection') ||
        msg.includes('offline');

      logEvent(user?.uid, 'paywall_restore_failed', {
        trigger,
        error_code: code || 'unknown',
        reason: isNetwork ? 'network' : 'sdk_error',
      });

      if (isNetwork) {
        Alert.alert('Couldn\'t reach the store', 'Couldn\'t reach the store. Check your connection.');
      } else {
        Alert.alert('Restore Failed', 'We hit an unexpected error. Please try again.');
      }
    }
  };

  const findPackage = (keyword) =>
    offerings?.availablePackages?.find(p => p.product?.identifier?.includes(keyword));

  const annualPkg = findPackage('annual');
  const monthlyPkg = findPackage('monthly');
  const lifetimePkg = findPackage('lifetime');

  const hasOfferings = !!(offerings?.availablePackages && offerings.availablePackages.length > 0);

  // Compute the annual savings vs monthly. Only show when meaningful (>0%) and
  // when both packages exist.
  let savingsPct = 0;
  if (annualPkg && monthlyPkg) {
    const annualPrice = Number(annualPkg.product?.price) || 0;
    const monthlyPrice = Number(monthlyPkg.product?.price) || 0;
    if (annualPrice > 0 && monthlyPrice > 0) {
      savingsPct = Math.round((1 - (annualPrice / 12) / monthlyPrice) * 100);
    }
  }

  // Compute monthly equivalent for the annual plan ("$x.xx/month").
  let annualMonthlyEquivalent = null;
  if (annualPkg) {
    const annualPrice = Number(annualPkg.product?.price) || 0;
    const currencyCode = annualPkg.product?.currencyCode || 'USD';
    if (annualPrice > 0) {
      try {
        annualMonthlyEquivalent = new Intl.NumberFormat(undefined, {
          style: 'currency',
          currency: currencyCode,
          minimumFractionDigits: 2,
          maximumFractionDigits: 2,
        }).format(annualPrice / 12);
      } catch (_e) {
        annualMonthlyEquivalent = `${(annualPrice / 12).toFixed(2)} ${currencyCode}`;
      }
    }
  }

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
        <ScrollView contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>
          {/* Close button */}
          <TouchableOpacity style={styles.closeButton} onPress={dismiss}>
            <Ionicons name="close" size={28} color="white" />
          </TouchableOpacity>

          {/* Header */}
          <View style={styles.header}>
            <View style={styles.iconContainer}>
              <Ionicons name="diamond" size={48} color="#FFDF00" />
            </View>
            <Text style={styles.headerTitle}>Upgrade to Premium</Text>
            <Text style={styles.headerSubtitle}>
              You&apos;ve used your 3 free scans this month.{'\n'}
              Go unlimited with Premium!
            </Text>
          </View>

          {/* Features */}
          <View style={styles.features}>
            {[
              ['scan-outline', 'Unlimited receipt scans'],
              ['flash-outline', 'Priority AI processing'],
              ['heart-outline', 'Support indie development'],
            ].map(([icon, text]) => (
              <View key={text} style={styles.featureRow}>
                <Ionicons name={icon} size={22} color="#4CDE80" />
                <Text style={styles.featureText}>{text}</Text>
              </View>
            ))}
          </View>

          {/* Purchase options */}
          {loading ? (
            <ActivityIndicator color="white" size="large" style={{ marginTop: 30 }} />
          ) : !hasOfferings ? (
            <View style={styles.unavailable}>
              <Ionicons name="cloud-offline-outline" size={28} color="white" />
              <Text style={styles.unavailableTitle}>Subscriptions are temporarily unavailable</Text>
              <Text style={styles.unavailableSubtitle}>
                Please check your connection and try again in a moment.
              </Text>
              <TouchableOpacity
                style={styles.retryButton}
                onPress={() => { setLoading(true); loadOfferings(); }}
              >
                <Text style={styles.retryText}>Retry</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <View style={styles.options}>
              {/* Annual — MOST POPULAR */}
              {annualPkg && (
                <TouchableOpacity
                  style={[styles.optionCard, styles.optionAnnual]}
                  onPress={() => handlePurchase(annualPkg)}
                  disabled={purchasing !== null}
                >
                  <View style={styles.mostPopularBadge}>
                    <Text style={styles.mostPopularText}>MOST POPULAR</Text>
                  </View>
                  {purchasing === annualPkg.identifier ? (
                    <ActivityIndicator color="#3442C6" />
                  ) : (
                    <View style={styles.optionRow}>
                      <View>
                        <Text style={styles.optionPrice}>
                          {annualPkg.product?.priceString}
                          <Text style={styles.optionPricePer}>/yr</Text>
                        </Text>
                        <Text style={styles.optionLabel}>Annual · 12 months</Text>
                      </View>
                      <View style={styles.optionRight}>
                        {savingsPct > 0 && (
                          <Text style={styles.optionSavings}>{`Save ${savingsPct}%`}</Text>
                        )}
                        <Text style={styles.optionDetail}>
                          {annualMonthlyEquivalent ? `${annualMonthlyEquivalent}/month · ` : ''}Cancel anytime
                        </Text>
                      </View>
                    </View>
                  )}
                </TouchableOpacity>
              )}

              {/* Monthly */}
              {monthlyPkg && (
                <TouchableOpacity
                  style={styles.optionCard}
                  onPress={() => handlePurchase(monthlyPkg)}
                  disabled={purchasing !== null}
                >
                  {purchasing === monthlyPkg.identifier ? (
                    <ActivityIndicator color="#3442C6" />
                  ) : (
                    <View style={styles.optionRow}>
                      <View>
                        <Text style={styles.optionPrice}>
                          {monthlyPkg.product?.priceString}
                          <Text style={styles.optionPricePer}>/mo</Text>
                        </Text>
                        <Text style={styles.optionLabel}>Monthly · 1 month</Text>
                      </View>
                      <Text style={styles.optionDetail}>Cancel anytime</Text>
                    </View>
                  )}
                </TouchableOpacity>
              )}

              {/* Lifetime */}
              {lifetimePkg && (
                <TouchableOpacity
                  style={styles.optionCard}
                  onPress={() => handlePurchase(lifetimePkg)}
                  disabled={purchasing !== null}
                >
                  {purchasing === lifetimePkg.identifier ? (
                    <ActivityIndicator color="#3442C6" />
                  ) : (
                    <View style={styles.optionRow}>
                      <View>
                        <Text style={styles.optionPrice}>{lifetimePkg.product?.priceString}</Text>
                        <Text style={styles.optionLabel}>Lifetime</Text>
                      </View>
                      <Text style={styles.optionDetail}>One-time purchase</Text>
                    </View>
                  )}
                </TouchableOpacity>
              )}
            </View>
          )}

          {/* App Store-required disclosure */}
          {hasOfferings && (
            <View style={styles.disclosure}>
              <Text style={styles.disclosureText}>
                Subscriptions auto-renew at the prices shown above until canceled. Subscription
                automatically renews unless canceled at least 24 hours before the end of the current
                period. Manage or cancel anytime in your App Store account settings.
              </Text>
              <View style={styles.disclosureLinks}>
                <TouchableOpacity onPress={() => Linking.openURL(TERMS_URL)}>
                  <Text style={styles.disclosureLink}>Terms of Service</Text>
                </TouchableOpacity>
                <Text style={styles.disclosureSeparator}>·</Text>
                <TouchableOpacity onPress={() => Linking.openURL(PRIVACY_URL)}>
                  <Text style={styles.disclosureLink}>Privacy Policy</Text>
                </TouchableOpacity>
              </View>
            </View>
          )}

          {/* Restore */}
          <TouchableOpacity style={styles.restoreButton} onPress={handleRestore}>
            <Text style={styles.restoreText}>Restore Purchases</Text>
          </TouchableOpacity>
        </ScrollView>
      </SafeAreaView>
    </>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  container: {
    paddingHorizontal: 24,
    paddingTop: 20,
    paddingBottom: 30,
  },
  closeButton: {
    alignSelf: 'flex-end',
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    alignItems: 'center',
    marginTop: 10,
    marginBottom: 30,
  },
  iconContainer: {
    width: 90,
    height: 90,
    borderRadius: 45,
    backgroundColor: 'rgba(255, 223, 0, 0.15)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: '900',
    color: 'white',
    marginBottom: 12,
  },
  headerSubtitle: {
    fontSize: 16,
    color: 'rgba(255,255,255,0.85)',
    textAlign: 'center',
    lineHeight: 22,
  },
  features: {
    marginBottom: 30,
  },
  featureRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 14,
    paddingHorizontal: 10,
  },
  featureText: {
    fontSize: 17,
    color: 'white',
    marginLeft: 14,
    fontWeight: '600',
  },
  options: {
    gap: 12,
    marginBottom: 20,
  },
  optionCard: {
    backgroundColor: 'white',
    borderRadius: 20,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 10,
    elevation: 5,
  },
  optionAnnual: {
    borderWidth: 2,
    borderColor: '#FFDF00',
    paddingTop: 28,
  },
  mostPopularBadge: {
    position: 'absolute',
    top: -14,
    alignSelf: 'center',
    backgroundColor: '#FFDF00',
    paddingVertical: 5,
    paddingHorizontal: 18,
    borderRadius: 12,
  },
  mostPopularText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#3442C6',
  },
  optionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  optionRight: {
    alignItems: 'flex-end',
  },
  optionPrice: {
    fontSize: 26,
    fontWeight: '900',
    color: '#3442C6',
  },
  optionPricePer: {
    fontSize: 16,
    fontWeight: '600',
    color: '#3442C6',
  },
  optionLabel: {
    fontSize: 15,
    fontWeight: '700',
    color: '#333',
    marginTop: 2,
  },
  optionDetail: {
    fontSize: 13,
    color: '#888',
  },
  optionSavings: {
    fontSize: 13,
    fontWeight: '700',
    color: '#4CDE80',
    marginBottom: 2,
  },
  unavailable: {
    backgroundColor: 'rgba(255,255,255,0.12)',
    borderRadius: 16,
    padding: 24,
    alignItems: 'center',
    marginBottom: 20,
  },
  unavailableTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: 'white',
    marginTop: 10,
    textAlign: 'center',
  },
  unavailableSubtitle: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.85)',
    marginTop: 6,
    textAlign: 'center',
    lineHeight: 20,
  },
  retryButton: {
    marginTop: 16,
    paddingHorizontal: 22,
    paddingVertical: 10,
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderRadius: 20,
  },
  retryText: {
    color: 'white',
    fontWeight: '700',
    fontSize: 14,
  },
  disclosure: {
    marginTop: 8,
    marginBottom: 4,
    paddingHorizontal: 4,
  },
  disclosureText: {
    fontSize: 11,
    lineHeight: 16,
    color: 'rgba(255,255,255,0.7)',
    textAlign: 'center',
  },
  disclosureLinks: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 8,
  },
  disclosureLink: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.9)',
    fontWeight: '600',
    textDecorationLine: 'underline',
  },
  disclosureSeparator: {
    color: 'rgba(255,255,255,0.6)',
    marginHorizontal: 8,
    fontSize: 12,
  },
  restoreButton: {
    alignItems: 'center',
    paddingVertical: 14,
  },
  restoreText: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: 14,
    fontWeight: '500',
  },
});
