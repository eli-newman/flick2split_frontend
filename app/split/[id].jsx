import { useEffect, useState } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet,
  Linking, ActivityIndicator, SafeAreaView,
} from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { doc, getDoc } from 'firebase/firestore';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { db } from '../config/firebase';

export default function PublicSplitView() {
  const { id } = useLocalSearchParams();
  const [splitData, setSplitData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!id) {
      setError('Invalid link.');
      setLoading(false);
      return;
    }
    getDoc(doc(db, 'publicSplits', id))
      .then((snap) => {
        if (snap.exists()) {
          setSplitData(snap.data());
        } else {
          setError('Split not found. The link may have expired.');
        }
      })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [id]);

  const openVenmo = (amount) => {
    const note = encodeURIComponent('Bill split');
    const venmoUrl = `venmo://paycharge?txn=pay&amount=${amount.toFixed(2)}&note=${note}`;
    Linking.canOpenURL(venmoUrl)
      .then((supported) => {
        if (supported) return Linking.openURL(venmoUrl);
        return Linking.openURL(`https://venmo.com/?txn=pay&amount=${amount.toFixed(2)}&note=${note}`);
      })
      .catch(() => {});
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#3442C6" />
      </View>
    );
  }

  if (error || !splitData) {
    return (
      <View style={styles.center}>
        <Ionicons name="alert-circle-outline" size={48} color="#ccc" />
        <Text style={styles.errorText}>{error || 'Split not found.'}</Text>
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>
        {/* App header */}
        <View style={styles.appHeader}>
          <Text style={styles.appName}>Flick2Split</Text>
        </View>

        {/* Restaurant name */}
        <View style={styles.restaurantCard}>
          <Ionicons name="restaurant-outline" size={24} color="#3442C6" style={styles.restaurantIcon} />
          <Text style={styles.restaurantName}>{splitData.restaurant || 'Bill Split'}</Text>
          <Text style={styles.restaurantCurrency}>{splitData.currency || 'USD'}</Text>
        </View>

        {/* Guest breakdown cards */}
        {(splitData.guests || []).map((guest, i) => (
          <View key={i} style={styles.guestCard}>
            <View style={styles.guestHeader}>
              <Text style={styles.guestName}>{guest.name}</Text>
              <Text style={styles.guestTotal}>
                {splitData.currency} {guest.total?.toFixed(2)}
              </Text>
            </View>

            {(guest.items || []).map((item, j) => (
              <View key={j} style={styles.itemRow}>
                <Text style={styles.itemName}>{item.name}</Text>
                <Text style={styles.itemPrice}>{item.price?.toFixed(2)}</Text>
              </View>
            ))}

            <View style={styles.divider} />

            <View style={styles.itemRow}>
              <Text style={styles.subtotalLabel}>Subtotal</Text>
              <Text style={styles.subtotalValue}>{guest.subtotal?.toFixed(2)}</Text>
            </View>
            <View style={styles.itemRow}>
              <Text style={styles.itemName}>Tax</Text>
              <Text style={styles.itemPrice}>{guest.tax?.toFixed(2)}</Text>
            </View>
            <View style={styles.itemRow}>
              <Text style={styles.itemName}>Tip</Text>
              <Text style={styles.itemPrice}>{guest.tip?.toFixed(2)}</Text>
            </View>

            <TouchableOpacity
              style={styles.venmoButton}
              onPress={() => openVenmo(guest.total || 0)}
            >
              <Text style={styles.venmoButtonText}>Pay with Venmo</Text>
            </TouchableOpacity>
          </View>
        ))}

        {/* App download CTA */}
        <LinearGradient
          colors={['#3442C6', '#7451FB']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.ctaCard}
        >
          <Text style={styles.ctaTitle}>Split your next bill in seconds</Text>
          <Text style={styles.ctaSubtitle}>
            Snap a receipt and let AI split it automatically among friends.
          </Text>
          <TouchableOpacity
            style={styles.ctaButton}
            onPress={() => Linking.openURL('https://apps.apple.com/search?term=flick2split')}
          >
            <Text style={styles.ctaButtonText}>Get Flick2Split — Free →</Text>
          </TouchableOpacity>
        </LinearGradient>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#f5f5f7',
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
    backgroundColor: '#f5f5f7',
  },
  errorText: {
    marginTop: 12,
    fontSize: 16,
    color: '#888',
    textAlign: 'center',
  },
  container: {
    padding: 16,
    paddingBottom: 40,
  },
  appHeader: {
    alignItems: 'center',
    marginBottom: 20,
    paddingTop: 8,
  },
  appName: {
    fontSize: 22,
    fontWeight: '900',
    color: '#3442C6',
    letterSpacing: -0.5,
  },
  restaurantCard: {
    backgroundColor: 'white',
    borderRadius: 16,
    padding: 20,
    alignItems: 'center',
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
  },
  restaurantIcon: {
    marginBottom: 8,
  },
  restaurantName: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1a1a1a',
    textAlign: 'center',
  },
  restaurantCurrency: {
    fontSize: 14,
    color: '#888',
    marginTop: 4,
  },
  guestCard: {
    backgroundColor: 'white',
    borderRadius: 16,
    padding: 18,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
  },
  guestHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  guestName: {
    fontSize: 17,
    fontWeight: '700',
    color: '#1a1a1a',
  },
  guestTotal: {
    fontSize: 17,
    fontWeight: '700',
    color: '#3442C6',
  },
  itemRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 4,
  },
  itemName: {
    fontSize: 14,
    color: '#666',
  },
  itemPrice: {
    fontSize: 14,
    color: '#666',
  },
  divider: {
    height: 1,
    backgroundColor: '#f0f0f0',
    marginVertical: 10,
  },
  subtotalLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
  },
  subtotalValue: {
    fontSize: 14,
    fontWeight: '600',
    color: '#3442C6',
  },
  venmoButton: {
    backgroundColor: '#3D95CE',
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: 'center',
    marginTop: 14,
  },
  venmoButtonText: {
    color: 'white',
    fontWeight: '700',
    fontSize: 15,
  },
  ctaCard: {
    borderRadius: 20,
    padding: 24,
    alignItems: 'center',
    marginTop: 8,
  },
  ctaTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: 'white',
    textAlign: 'center',
    marginBottom: 8,
  },
  ctaSubtitle: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.85)',
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 16,
  },
  ctaButton: {
    backgroundColor: 'white',
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 24,
  },
  ctaButtonText: {
    color: '#3442C6',
    fontWeight: '700',
    fontSize: 15,
  },
});
