import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Linking, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { currencies } from '../utils/currencies';
import { useRequireAuth } from '../auth/SignUpSheetContext';

const GuestSummary = ({ 
  guests, 
  expandedGuest, 
  toggleGuestDetails, 
  formatCurrencyAmount, 
  originalCurrency, 
  targetCurrency, 
  exchangeRate 
}) => {
  
  // Get currency symbol from currency code
  const getCurrencySymbol = (currencyCode) => {
    const currency = currencies && currencies.find(c => c.code === currencyCode);
    return currency ? currency.symbol : '$';
  };
  
  // Format amounts without conversion and without symbol
  const formatOriginalAmount = (amount) => {
    return amount.toFixed(2);
  };
  
  // Format total with appropriate symbol based on conversion status
  const formatTotal = (amount) => {
    // Check if conversion is active
    const isConversionActive = targetCurrency && targetCurrency !== originalCurrency;
    
    if (isConversionActive) {
      // If converting, original total uses original currency symbol
      const symbol = getCurrencySymbol(originalCurrency);
      return `${symbol}${amount.toFixed(2)}`;
    } else {
      // After reset or no conversion, just show the number without symbol
      return amount.toFixed(2);
    }
  };
  
  // Format converted total with new currency symbol
  const formatConvertedTotal = (amount) => {
    return formatCurrencyAmount(amount * exchangeRate);
  };
  
  // Check if conversion is active
  const isConversionActive = targetCurrency && targetCurrency !== originalCurrency;

  const requireAuth = useRequireAuth();

  const openVenmo = (amount, guestName) => {
    requireAuth(
      () => {
        const note = encodeURIComponent(`Bill split`);
        const venmoUrl = `venmo://paycharge?txn=pay&amount=${amount.toFixed(2)}&note=${note}`;
        Linking.canOpenURL(venmoUrl)
          .then(supported => {
            if (supported) return Linking.openURL(venmoUrl);
            const webUrl = `https://venmo.com/?txn=pay&amount=${amount.toFixed(2)}&note=${note}`;
            return Linking.openURL(webUrl);
          })
          .catch(() => Alert.alert('Error', 'Could not open Venmo'));
      },
      {
        surface: 'post_split_venmo',
        title: `Send ${guestName} their share`,
        subtitle: 'Sign up to save this split and pay with Venmo. Takes 5 seconds.',
      }
    );
  };

  return (
    <View style={styles.card}>
      <Text style={styles.sectionTitle}>Guest Totals</Text>
      {[...guests].reverse().map((guest, index) => (
        <View key={index} style={styles.guestSummary}>
          <TouchableOpacity 
            style={styles.guestSummaryHeader}
            onPress={() => toggleGuestDetails(index)}
          >
            <Text style={styles.guestName}>{guest.name}</Text>
            <View style={styles.guestTotalContainer}>
              <Text style={styles.guestTotal}>
                Total: {isConversionActive ? 
                  formatConvertedTotal(guest.total) : 
                  formatTotal(guest.total)}
              </Text>
              <Ionicons 
                name={expandedGuest === index ? "chevron-up" : "chevron-down"} 
                size={18} 
                color="#666"
              />
            </View>
          </TouchableOpacity>
          
          {expandedGuest === index && (
            <View style={styles.guestDetails}>
              {guest.items.map((item, itemIndex) => (
                <View key={itemIndex} style={styles.guestItemRow}>
                  <Text style={styles.guestItemName}>{item.name}</Text>
                  <Text style={styles.guestItemPrice}>
                    {formatOriginalAmount(item.price)}
                  </Text>
                </View>
              ))}
              
              <View style={styles.guestItemDivider} />
              
              <View style={styles.guestItemRow}>
                <Text style={styles.guestItemSubtotal}>Subtotal</Text>
                <Text style={styles.guestItemSubtotalPrice}>
                  {formatOriginalAmount(guest.subtotal)}
                </Text>
              </View>
              
              <View style={styles.guestItemRow}>
                <Text style={styles.guestItemName}>Tax</Text>
                <Text style={styles.guestItemPrice}>
                  {formatOriginalAmount(guest.tax)}
                </Text>
              </View>
              
              <View style={styles.guestItemRow}>
                <Text style={styles.guestItemName}>Tip</Text>
                <Text style={styles.guestItemPrice}>
                  {formatOriginalAmount(guest.tip)}
                </Text>
              </View>
              
              <View style={styles.guestItemDivider} />
              
              {/* Show original total when conversion is active */}
              {isConversionActive && (
                <View style={styles.guestItemRow}>
                  <Text style={styles.guestItemOriginalTotal}>Original Total</Text>
                  <Text style={styles.guestItemOriginalTotalPrice}>
                    {`${getCurrencySymbol(originalCurrency)}${guest.total.toFixed(2)}`}
                  </Text>
                </View>
              )}
              
              {/* Currency Conversion Info - Show only if conversion is active */}
              {isConversionActive && (
                <View style={styles.conversionInfoBox}>
                  <View style={styles.conversionHeader}>
                    <Ionicons name="swap-horizontal" size={16} color="#3442C6" style={{marginRight: 8}} />
                    <Text style={styles.conversionTitle}>Currency Conversion</Text>
                  </View>
                  <Text style={styles.conversionText}>
                    {originalCurrency} → {targetCurrency} @ {exchangeRate.toFixed(4)}
                  </Text>
                </View>
              )}
              
              <View style={styles.guestItemRow}>
                <Text style={styles.guestItemTotal}>Total</Text>
                <Text style={styles.guestItemTotalPrice}>
                  {isConversionActive ?
                    formatConvertedTotal(guest.total) :
                    formatTotal(guest.total)}
                </Text>
              </View>

              <TouchableOpacity
                style={styles.venmoButton}
                onPress={() => openVenmo(
                  isConversionActive ? guest.total * exchangeRate : guest.total,
                  guest.name
                )}
              >
                <Text style={styles.venmoButtonText}>Pay with Venmo</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>
      ))}
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: 'white',
    borderRadius: 20,
    padding: 20,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 5,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#3442C6',
    marginBottom: 15,
  },
  guestSummary: {
    marginBottom: 15,
    borderWidth: 1,
    borderColor: '#f0f0f0',
    borderRadius: 8,
    overflow: 'hidden',
  },
  guestSummaryHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 12,
    paddingHorizontal: 15,
    backgroundColor: '#f9f9f9',
    alignItems: 'center',
  },
  guestName: {
    fontWeight: '600',
    color: '#333',
  },
  guestTotalContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  guestTotal: {
    color: '#3442C6',
    fontWeight: '600',
    marginRight: 5,
  },
  guestDetails: {
    padding: 15,
    backgroundColor: 'white',
  },
  guestItemRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 6,
  },
  guestItemName: {
    color: '#666',
  },
  guestItemPrice: {
    color: '#666',
  },
  guestItemTotal: {
    fontWeight: '600',
    color: '#333',
    marginTop: 5,
  },
  guestItemTotalPrice: {
    fontWeight: '600',
    color: '#3442C6',
    marginTop: 5,
  },
  guestItemOriginalTotal: {
    fontWeight: '600',
    color: '#333',
    fontStyle: 'italic',
  },
  guestItemOriginalTotalPrice: {
    fontWeight: '600',
    color: '#666',
    fontStyle: 'italic',
  },
  guestItemDivider: {
    height: 1,
    backgroundColor: '#f0f0f0',
    marginVertical: 10,
  },
  guestItemSubtotal: {
    fontWeight: '600',
    color: '#333',
  },
  guestItemSubtotalPrice: {
    fontWeight: '600',
    color: '#3442C6',
  },
  conversionInfoBox: {
    backgroundColor: 'rgba(52, 66, 198, 0.05)',
    borderRadius: 8,
    padding: 12,
    marginBottom: 15,
    borderLeftWidth: 3,
    borderLeftColor: '#3442C6',
  },
  conversionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  conversionTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#3442C6',
  },
  conversionText: {
    fontSize: 13,
    color: '#666',
  },
  venmoButton: {
    backgroundColor: '#3D95CE',
    borderRadius: 8,
    paddingVertical: 10,
    alignItems: 'center',
    marginTop: 12,
  },
  venmoButtonText: {
    color: 'white',
    fontWeight: '700',
    fontSize: 14,
  },
});

export default React.memo(GuestSummary);