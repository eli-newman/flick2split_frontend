import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

const SplitEvenlyBillSummary = ({
  subtotalValue,
  taxValue,
  tipValue,
  totalValue,
  currencySymbol,
  originalCurrency,
  targetCurrency,
  exchangeRate,
  formatAmount,
  getCurrencySymbol
}) => {
  // Check if currency conversion is active
  const isConversionActive = originalCurrency && targetCurrency && targetCurrency !== originalCurrency;
  
  return (
    <View style={styles.summaryCard}>
      <View style={styles.summaryHeader}>
        <Ionicons name="receipt-outline" size={24} color="white" style={styles.summaryIcon} />
        <Text style={styles.summaryTitle}>Bill Summary</Text>
      </View>
      
      <View style={styles.summaryRow}>
        <Text style={styles.summaryLabel}>Subtotal</Text>
        <Text style={styles.summaryValue}>{formatAmount(subtotalValue)}</Text>
      </View>
      
      <View style={styles.summaryRow}>
        <Text style={styles.summaryLabel}>Tax</Text>
        <Text style={styles.summaryValue}>{formatAmount(taxValue)}</Text>
      </View>
      
      <View style={styles.summaryRow}>
        <Text style={styles.summaryLabel}>Tip</Text>
        <Text style={styles.summaryValue}>{formatAmount(tipValue)}</Text>
      </View>
      
      <View style={[styles.summaryRow, styles.totalRow]}>
        <Text style={styles.totalLabel}>Total</Text>
        <Text style={styles.totalValue}>
          {formatAmount(totalValue)} {isConversionActive ? getCurrencySymbol(originalCurrency) : ''}
        </Text>
      </View>
      
      {/* Show currency code badge when no conversion and not USD */}
      {!isConversionActive && originalCurrency && !(originalCurrency === 'USD' && currencySymbol === '$') && (
        <View style={styles.currencyBadge}>
          <Text style={styles.currencyBadgeText}>
            {currencySymbol} {originalCurrency}
          </Text>
        </View>
      )}
      
      {/* Show converted total when currencies are different */}
      {isConversionActive && (
        <View style={styles.conversionInfo}>
          <View style={styles.conversionHeader}>
            <Ionicons name="swap-horizontal" size={16} color="rgba(255, 255, 255, 0.9)" style={{marginRight: 5}} />
            <Text style={styles.conversionTitle}>
              {originalCurrency} → {targetCurrency}
            </Text>
          </View>
          <Text style={styles.conversionText}>
            <Text style={styles.convertedLabel}>Converted Total: </Text>
            {getCurrencySymbol(targetCurrency)}{formatAmount(totalValue * exchangeRate)}
          </Text>
          <Text style={styles.conversionRate}>Rate: 1 {originalCurrency} = {exchangeRate.toFixed(4)} {targetCurrency}</Text>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  summaryCard: {
    backgroundColor: "rgba(255, 255, 255, 0.1)",
    borderRadius: 20,
    padding: 20,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.2)",
  },
  summaryHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 15,
  },
  summaryIcon: {
    marginRight: 10,
  },
  summaryTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "white",
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  summaryLabel: {
    fontSize: 16,
    color: "white",
    opacity: 0.9,
  },
  summaryValue: {
    fontSize: 16,
    color: "white",
    fontWeight: "600",
  },
  totalRow: {
    borderTopWidth: 1,
    borderTopColor: "rgba(255, 255, 255, 0.2)",
    paddingTop: 12,
    marginTop: 5,
  },
  totalLabel: {
    fontSize: 18,
    color: "white",
    fontWeight: "700",
  },
  totalValue: {
    fontSize: 18,
    color: "white",
    fontWeight: "800",
  },
  currencyBadge: {
    backgroundColor: "rgba(255, 255, 255, 0.1)",
    alignSelf: 'flex-end',
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 12,
    marginTop: 6,
  },
  currencyBadgeText: {
    fontSize: 12,
    color: "rgba(255, 255, 255, 0.9)",
    fontWeight: "500",
  },
  conversionInfo: {
    marginTop: 12,
    backgroundColor: "rgba(255, 255, 255, 0.1)",
    borderRadius: 12,
    padding: 12,
    borderLeftWidth: 3,
    borderLeftColor: "rgba(76, 222, 128, 0.7)",
  },
  conversionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  conversionTitle: {
    fontSize: 14,
    fontWeight: "600",
    color: "rgba(255, 255, 255, 0.9)",
  },
  conversionText: {
    fontSize: 18,
    color: "white",
    fontWeight: "700",
    marginVertical: 4,
  },
  convertedLabel: {
    fontSize: 16,
    color: "rgba(255, 255, 255, 0.9)",
    fontWeight: "600",
  },
  conversionRate: {
    fontSize: 13,
    color: "rgba(255, 255, 255, 0.7)",
    marginTop: 2,
  }
});

export default React.memo(SplitEvenlyBillSummary);