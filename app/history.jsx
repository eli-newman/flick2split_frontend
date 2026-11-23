import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  ActivityIndicator,
  SafeAreaView,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { collection, query, orderBy, getDocs } from 'firebase/firestore';
import { db } from './config/firebase';
import { useAuth } from './config/AuthContext';
import { currencies } from './utils/currencies';
import { logEvent } from './utils/analytics';

export default function History() {
  const router = useRouter();
  const { user } = useAuth();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!user) return;
    logEvent(user.uid, 'history_opened');

    (async () => {
      try {
        const [scansSnap, splitsSnap] = await Promise.all([
          getDocs(query(collection(db, 'users', user.uid, 'scans'), orderBy('createdAt', 'desc'))),
          getDocs(query(collection(db, 'users', user.uid, 'splits'), orderBy('createdAt', 'desc'))),
        ]);

        const scans = scansSnap.docs.map(doc => ({
          id: `scan-${doc.id}`,
          type: 'scan',
          ...doc.data(),
        }));
        const splits = splitsSnap.docs.map(doc => ({
          id: `split-${doc.id}`,
          type: 'split',
          ...doc.data(),
        }));

        // Merge and sort newest first
        const merged = [...scans, ...splits].sort((a, b) => {
          const aTime = a.createdAt?.toDate?.() ?? new Date(0);
          const bTime = b.createdAt?.toDate?.() ?? new Date(0);
          return bTime - aTime;
        });

        setItems(merged);
      } catch (e) {
        console.error('Error fetching history:', e);
        const msg = e.message || '';
        if (msg.includes('network') || msg.includes('Network') || msg.includes('fetch') || e.code === 'unavailable') {
          setError('offline');
        } else {
          setError('unknown');
        }
      } finally {
        setLoading(false);
      }
    })();
  }, [user]);

  const formatDate = (timestamp) => {
    if (!timestamp) return 'Unknown date';
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    });
  };

  const handleResplit = (bill) => {
    router.push({
      pathname: '/results',
      params: { bill: JSON.stringify(bill) },
    });
  };

  const getCurrencySymbol = (code) => {
    const currency = currencies && currencies.find(c => c.code === code);
    return currency ? currency.symbol : '$';
  };

  const renderScanCard = (item) => {
    const bill = item.bill || {};
    const isExpanded = expandedId === item.id;
    const sym = getCurrencySymbol(bill.currency);

    return (
      <TouchableOpacity
        style={styles.scanCard}
        onPress={() => setExpandedId(isExpanded ? null : item.id)}
        activeOpacity={0.7}
      >
        <View style={styles.scanHeader}>
          <View style={styles.scanHeaderLeft}>
            <View style={styles.scanTitleRow}>
              <Text style={styles.restaurantName} numberOfLines={1}>
                {bill.restaurant || 'Unknown Restaurant'}
              </Text>
            </View>
            <Text style={styles.scanDate}>{formatDate(item.createdAt)}</Text>
          </View>
          <View style={styles.scanHeaderRight}>
            <Text style={styles.scanTotal}>
              {sym}{(bill.total || 0).toFixed(2)}
            </Text>
            <Ionicons
              name={isExpanded ? 'chevron-up' : 'chevron-down'}
              size={18}
              color="#999"
            />
          </View>
        </View>

        {isExpanded && (
          <View style={styles.scanDetails}>
            <View style={styles.divider} />

            {bill.items && bill.items.length > 0 && (
              <>
                <Text style={styles.detailLabel}>Items</Text>
                {bill.items.map((itm, idx) => (
                  <View key={idx} style={styles.itemRow}>
                    <Text style={styles.itemName} numberOfLines={1}>
                      {itm.name}
                    </Text>
                    <Text style={styles.itemPrice}>
                      {sym}{(itm.price || 0).toFixed(2)}
                    </Text>
                  </View>
                ))}
              </>
            )}

            <View style={styles.divider} />

            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Subtotal</Text>
              <Text style={styles.summaryValue}>
                {sym}{(bill.subtotal || 0).toFixed(2)}
              </Text>
            </View>
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Tax</Text>
              <Text style={styles.summaryValue}>
                {sym}{(bill.tax || 0).toFixed(2)}
              </Text>
            </View>
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabelBold}>Total</Text>
              <Text style={styles.summaryValueBold}>
                {sym}{(bill.total || 0).toFixed(2)}
              </Text>
            </View>

            <TouchableOpacity
              style={styles.resplitButton}
              onPress={() => handleResplit(bill)}
              activeOpacity={0.7}
            >
              <Ionicons name="arrow-redo-outline" size={16} color="white" />
              <Text style={styles.resplitButtonText}>Re-split this bill</Text>
            </TouchableOpacity>
          </View>
        )}
      </TouchableOpacity>
    );
  };

  const renderSplitCard = (item) => {
    const bill = item.bill || {};
    const guests = item.guests || [];
    const isExpanded = expandedId === item.id;
    const sym = getCurrencySymbol(bill.currency);

    return (
      <TouchableOpacity
        style={[styles.scanCard, styles.splitCard]}
        onPress={() => setExpandedId(isExpanded ? null : item.id)}
        activeOpacity={0.7}
      >
        <View style={styles.scanHeader}>
          <View style={styles.scanHeaderLeft}>
            <View style={styles.scanTitleRow}>
              <View style={styles.splitBadge}>
                <Text style={styles.splitBadgeText}>Split</Text>
              </View>
              <Text style={styles.restaurantName} numberOfLines={1}>
                {bill.restaurant || 'Unknown Restaurant'}
              </Text>
            </View>
            <Text style={styles.scanDate}>
              {formatDate(item.createdAt)} · {guests.length} {guests.length === 1 ? 'guest' : 'guests'}
            </Text>
          </View>
          <View style={styles.scanHeaderRight}>
            <Text style={styles.scanTotal}>
              {sym}{(bill.total || 0).toFixed(2)}
            </Text>
            <Ionicons
              name={isExpanded ? 'chevron-up' : 'chevron-down'}
              size={18}
              color="#999"
            />
          </View>
        </View>

        {isExpanded && (
          <View style={styles.scanDetails}>
            <View style={styles.divider} />
            <Text style={styles.detailLabel}>Who paid what</Text>
            {guests.map((guest, idx) => (
              <View key={idx} style={styles.guestBlock}>
                <View style={styles.guestHeaderRow}>
                  <Text style={styles.guestName}>{guest.name}</Text>
                  <Text style={styles.guestTotal}>
                    {sym}{(guest.total || 0).toFixed(2)}
                  </Text>
                </View>
                {guest.items && guest.items.map((itm, iidx) => (
                  <View key={iidx} style={styles.guestItemRow}>
                    <Text style={styles.guestItemName} numberOfLines={1}>
                      {itm.name}
                    </Text>
                    <Text style={styles.guestItemPrice}>
                      {sym}{(itm.price || 0).toFixed(2)}
                    </Text>
                  </View>
                ))}
              </View>
            ))}
          </View>
        )}
      </TouchableOpacity>
    );
  };

  const renderItem = ({ item }) => {
    if (item.type === 'split') return renderSplitCard(item);
    return renderScanCard(item);
  };

  const hasSomeHistory = items.length > 0;

  return (
    <>
      <LinearGradient
        colors={['#3442C6', '#5B42E8', '#7451FB', '#8360FF']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={StyleSheet.absoluteFillObject}
      />
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.container}>
          <StatusBar style="light" />

          <View style={styles.header}>
            <TouchableOpacity
              style={styles.backButton}
              onPress={() => router.back()}
            >
              <Ionicons name="arrow-back" size={24} color="white" />
            </TouchableOpacity>
            <Text style={styles.title}>History</Text>
            <View style={styles.placeholder} />
          </View>

          {loading ? (
            <View style={styles.centered}>
              <ActivityIndicator size="large" color="white" />
            </View>
          ) : error ? (
            <View style={styles.centered}>
              <Ionicons
                name={error === 'offline' ? 'cloud-offline-outline' : 'alert-circle-outline'}
                size={64}
                color="rgba(255,255,255,0.4)"
              />
              <Text style={styles.emptyText}>
                {error === 'offline' ? 'No Internet Connection' : 'Something went wrong'}
              </Text>
              <Text style={styles.emptySubtext}>
                {error === 'offline'
                  ? 'Connect to the internet to view your history.'
                  : 'Unable to load your history. Please try again later.'}
              </Text>
            </View>
          ) : !hasSomeHistory ? (
            <View style={styles.centered}>
              <Ionicons name="receipt-outline" size={64} color="rgba(255,255,255,0.4)" />
              <Text style={styles.emptyText}>No history yet</Text>
              <Text style={styles.emptySubtext}>
                Scan a receipt to see it here
              </Text>
            </View>
          ) : (
            <FlatList
              data={items}
              renderItem={renderItem}
              keyExtractor={(item) => item.id}
              contentContainerStyle={styles.listContent}
              showsVerticalScrollIndicator={false}
            />
          )}
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
    paddingTop: 30,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    marginBottom: 15,
    height: 40,
  },
  backButton: {
    padding: 5,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: 'white',
    textAlign: 'center',
  },
  placeholder: {
    width: 34,
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
  },
  emptyText: {
    color: 'white',
    fontSize: 20,
    fontWeight: '600',
    marginTop: 16,
  },
  emptySubtext: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: 15,
    marginTop: 8,
    textAlign: 'center',
  },
  listContent: {
    paddingHorizontal: 20,
    paddingBottom: 30,
  },
  scanCard: {
    backgroundColor: 'white',
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 6,
    elevation: 3,
  },
  splitCard: {
    borderLeftWidth: 3,
    borderLeftColor: '#4CDE80',
  },
  scanHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  scanHeaderLeft: {
    flex: 1,
    marginRight: 12,
  },
  scanTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
  },
  splitBadge: {
    backgroundColor: 'rgba(76, 222, 128, 0.15)',
    borderRadius: 4,
    paddingHorizontal: 6,
    paddingVertical: 2,
    marginRight: 6,
    borderWidth: 1,
    borderColor: 'rgba(76, 222, 128, 0.4)',
  },
  splitBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#2a9a50',
    textTransform: 'uppercase',
  },
  scanHeaderRight: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  restaurantName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    flexShrink: 1,
  },
  scanDate: {
    fontSize: 13,
    color: '#999',
    marginTop: 2,
  },
  scanTotal: {
    fontSize: 18,
    fontWeight: '700',
    color: '#3442C6',
    marginRight: 8,
  },
  scanDetails: {
    marginTop: 8,
  },
  divider: {
    height: 1,
    backgroundColor: '#f0f0f0',
    marginVertical: 10,
  },
  detailLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: '#999',
    marginBottom: 6,
    textTransform: 'uppercase',
  },
  itemRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 4,
  },
  itemName: {
    fontSize: 14,
    color: '#555',
    flex: 1,
    marginRight: 8,
  },
  itemPrice: {
    fontSize: 14,
    color: '#555',
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 3,
  },
  summaryLabel: {
    fontSize: 14,
    color: '#666',
  },
  summaryValue: {
    fontSize: 14,
    color: '#666',
  },
  summaryLabelBold: {
    fontSize: 15,
    fontWeight: '600',
    color: '#333',
  },
  summaryValueBold: {
    fontSize: 15,
    fontWeight: '700',
    color: '#3442C6',
  },
  resplitButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#3442C6',
    borderRadius: 25,
    paddingVertical: 10,
    marginTop: 12,
  },
  resplitButtonText: {
    color: 'white',
    fontWeight: '600',
    fontSize: 14,
    marginLeft: 6,
  },
  // Split card guest breakdown
  guestBlock: {
    marginBottom: 12,
    backgroundColor: '#f9f9f9',
    borderRadius: 8,
    padding: 10,
  },
  guestHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  guestName: {
    fontSize: 14,
    fontWeight: '700',
    color: '#333',
  },
  guestTotal: {
    fontSize: 14,
    fontWeight: '700',
    color: '#3442C6',
  },
  guestItemRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 2,
  },
  guestItemName: {
    fontSize: 13,
    color: '#666',
    flex: 1,
    marginRight: 8,
  },
  guestItemPrice: {
    fontSize: 13,
    color: '#666',
  },
});
