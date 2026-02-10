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

export default function History() {
  const router = useRouter();
  const { user } = useAuth();
  const [scans, setScans] = useState([]);
  const [loading, setLoading] = useState(true);
  const [expandedScan, setExpandedScan] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!user) return;

    (async () => {
      try {
        const scansRef = collection(db, 'users', user.uid, 'scans');
        const q = query(scansRef, orderBy('createdAt', 'desc'));
        const snapshot = await getDocs(q);
        const scanList = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data(),
        }));
        setScans(scanList);
      } catch (e) {
        console.error('Error fetching scans:', e);
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

  const renderScan = ({ item }) => {
    const bill = item.bill || {};
    const isExpanded = expandedScan === item.id;

    return (
      <TouchableOpacity
        style={styles.scanCard}
        onPress={() => setExpandedScan(isExpanded ? null : item.id)}
        activeOpacity={0.7}
      >
        <View style={styles.scanHeader}>
          <View style={styles.scanHeaderLeft}>
            <Text style={styles.restaurantName} numberOfLines={1}>
              {bill.restaurant || 'Unknown Restaurant'}
            </Text>
            <Text style={styles.scanDate}>{formatDate(item.createdAt)}</Text>
          </View>
          <View style={styles.scanHeaderRight}>
            <Text style={styles.scanTotal}>
              ${(bill.total || 0).toFixed(2)}
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
                {bill.items.map((item, idx) => (
                  <View key={idx} style={styles.itemRow}>
                    <Text style={styles.itemName} numberOfLines={1}>
                      {item.name}
                    </Text>
                    <Text style={styles.itemPrice}>
                      ${(item.price || 0).toFixed(2)}
                    </Text>
                  </View>
                ))}
              </>
            )}

            <View style={styles.divider} />

            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Subtotal</Text>
              <Text style={styles.summaryValue}>
                ${(bill.subtotal || 0).toFixed(2)}
              </Text>
            </View>
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Tax</Text>
              <Text style={styles.summaryValue}>
                ${(bill.tax || 0).toFixed(2)}
              </Text>
            </View>
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabelBold}>Total</Text>
              <Text style={styles.summaryValueBold}>
                ${(bill.total || 0).toFixed(2)}
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
            <Text style={styles.title}>Past Receipts</Text>
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
                  ? 'Connect to the internet to view your past receipts.'
                  : 'Unable to load your receipts. Please try again later.'}
              </Text>
            </View>
          ) : scans.length === 0 ? (
            <View style={styles.centered}>
              <Ionicons name="receipt-outline" size={64} color="rgba(255,255,255,0.4)" />
              <Text style={styles.emptyText}>No receipts yet</Text>
              <Text style={styles.emptySubtext}>
                Scan a receipt to see it here
              </Text>
            </View>
          ) : (
            <FlatList
              data={scans}
              renderItem={renderScan}
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
  scanHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  scanHeaderLeft: {
    flex: 1,
    marginRight: 12,
  },
  scanHeaderRight: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  restaurantName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
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
});
