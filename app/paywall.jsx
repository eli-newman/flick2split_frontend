import { useState, useEffect } from 'react';
import {
  Text, View, TouchableOpacity, StyleSheet, ActivityIndicator, Alert,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { SafeAreaView } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useRouter } from 'expo-router';
import { getOfferings, purchasePackage, restorePurchases } from './config/purchases';

export default function Paywall() {
  const router = useRouter();
  const [offerings, setOfferings] = useState(null);
  const [loading, setLoading] = useState(true);
  const [purchasing, setPurchasing] = useState(null);

  useEffect(() => {
    loadOfferings();
  }, []);

  const loadOfferings = async () => {
    const current = await getOfferings();
    setOfferings(current);
    setLoading(false);
  };

  const handlePurchase = async (pkg) => {
    setPurchasing(pkg.identifier);
    try {
      await purchasePackage(pkg);
      Alert.alert('Welcome to Premium!', 'You now have unlimited scans.', [
        { text: 'OK', onPress: () => router.back() },
      ]);
    } catch (error) {
      if (!error.userCancelled) {
        Alert.alert('Purchase Failed', 'Please try again later.');
      }
    } finally {
      setPurchasing(null);
    }
  };

  const handleRestore = async () => {
    try {
      await restorePurchases();
      Alert.alert('Restored', 'Your purchases have been restored.', [
        { text: 'OK', onPress: () => router.back() },
      ]);
    } catch (error) {
      Alert.alert('Restore Failed', 'No previous purchases found.');
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
        <View style={styles.container}>
          {/* Close button */}
          <TouchableOpacity style={styles.closeButton} onPress={() => router.back()}>
            <Ionicons name="close" size={28} color="white" />
          </TouchableOpacity>

          {/* Header */}
          <View style={styles.header}>
            <View style={styles.iconContainer}>
              <Ionicons name="diamond" size={48} color="#FFDF00" />
            </View>
            <Text style={styles.headerTitle}>Upgrade to Premium</Text>
            <Text style={styles.headerSubtitle}>
              You've used your 3 free scans this month.{'\n'}
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
          ) : (
            <View style={styles.options}>
              {/* Lifetime */}
              <TouchableOpacity
                style={[styles.optionCard, styles.optionLifetime]}
                onPress={() => {
                  const pkg = offerings?.availablePackages?.find(
                    p => p.product.identifier.includes('lifetime')
                  );
                  if (pkg) handlePurchase(pkg);
                }}
                disabled={purchasing !== null}
              >
                <View style={styles.bestValueBadge}>
                  <Text style={styles.bestValueText}>BEST VALUE</Text>
                </View>
                {purchasing === 'lifetime' ? (
                  <ActivityIndicator color="#3442C6" />
                ) : (
                  <>
                    <Text style={styles.optionPrice}>$9.99</Text>
                    <Text style={styles.optionLabel}>Lifetime</Text>
                    <Text style={styles.optionDetail}>One-time purchase</Text>
                  </>
                )}
              </TouchableOpacity>

              {/* Monthly */}
              <TouchableOpacity
                style={styles.optionCard}
                onPress={() => {
                  const pkg = offerings?.availablePackages?.find(
                    p => p.product.identifier.includes('monthly')
                  );
                  if (pkg) handlePurchase(pkg);
                }}
                disabled={purchasing !== null}
              >
                {purchasing === 'monthly' ? (
                  <ActivityIndicator color="#3442C6" />
                ) : (
                  <>
                    <Text style={styles.optionPrice}>$1.99</Text>
                    <Text style={styles.optionLabel}>Monthly</Text>
                    <Text style={styles.optionDetail}>Cancel anytime</Text>
                  </>
                )}
              </TouchableOpacity>
            </View>
          )}

          {/* Restore */}
          <TouchableOpacity style={styles.restoreButton} onPress={handleRestore}>
            <Text style={styles.restoreText}>Restore Purchases</Text>
          </TouchableOpacity>
        </View>
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
    paddingHorizontal: 24,
    paddingTop: 20,
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
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  optionCard: {
    flex: 1,
    backgroundColor: 'white',
    borderRadius: 20,
    padding: 22,
    alignItems: 'center',
    marginHorizontal: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 10,
    elevation: 5,
  },
  optionLifetime: {
    borderWidth: 2,
    borderColor: '#FFDF00',
  },
  bestValueBadge: {
    position: 'absolute',
    top: -12,
    backgroundColor: '#FFDF00',
    paddingVertical: 4,
    paddingHorizontal: 14,
    borderRadius: 12,
  },
  bestValueText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#3442C6',
  },
  optionPrice: {
    fontSize: 28,
    fontWeight: '900',
    color: '#3442C6',
    marginTop: 6,
  },
  optionLabel: {
    fontSize: 16,
    fontWeight: '700',
    color: '#333',
    marginTop: 4,
  },
  optionDetail: {
    fontSize: 13,
    color: '#888',
    marginTop: 4,
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
