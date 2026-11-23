import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';

/**
 * BillSummary component for displaying bill totals and split button
 */
export const BillSummary = ({
  bill,
  formatCurrency,
  handleSplitBill,
  handleSplitByItem,
  splitComplete,
  shareGuestList
}) => {
  const router = useRouter();
  
  // Function to handle split evenly navigation
  const handleSplitEvenly = () => {
    router.push({
      pathname: '/split-evenly',
      params: { billData: JSON.stringify(bill) }
    });
  };
  
  return (
    <View style={styles.container}>
      <View style={styles.headerContainer}>
        <Text style={styles.sectionTitle}>Bill Summary</Text>
        <Ionicons name="receipt" size={22} color="#3442C6" />
      </View>
      
      <View style={styles.summarySection}>
        <View style={styles.summaryRow}>
          <Text style={styles.summaryLabel}>Subtotal</Text>
          <Text style={styles.summaryValue}>{formatCurrency(bill.subtotal)}</Text>
        </View>
        
        <View style={styles.summaryRow}>
          <Text style={styles.summaryLabel}>Tax</Text>
          <Text style={styles.summaryValue}>{formatCurrency(bill.tax)}</Text>
        </View>
        
        <View style={styles.summaryRow}>
          <Text style={styles.summaryLabel}>Tip</Text>
          <Text style={styles.summaryValue}>{formatCurrency(bill.tip)}</Text>
        </View>
      </View>
      
      <View style={styles.divider} />
      
      <View style={styles.totalRow}>
        <Text style={styles.totalLabel}>Total</Text>
        <Text style={styles.totalValue}>{formatCurrency(bill.total)}</Text>
      </View>
      
      <View style={styles.buttonContainer}>
        <TouchableOpacity 
          style={[styles.splitButton, styles.splitByItemButton]} 
          onPress={handleSplitBill}
          disabled={splitComplete}
        >
          <View style={styles.buttonIconContainer}>
            <Ionicons name="receipt-outline" size={24} color="#3442C6" />
          </View>
          <Text style={styles.splitButtonText}>Split by Item</Text>
        </TouchableOpacity>
        <Text style={styles.buttonDescription}>Only pay for what you ordered</Text>
        
        <TouchableOpacity 
          style={[styles.splitButton, styles.splitEvenlyButton]} 
          onPress={handleSplitEvenly}
        >
          <View style={styles.buttonIconContainer}>
            <Ionicons name="people-outline" size={24} color="#3442C6" />
          </View>
          <Text style={styles.splitButtonText}>Split Evenly</Text>
        </TouchableOpacity>
        <Text style={styles.buttonDescription}>Everyone pays the same amount</Text>
      </View>
    </View>
  );
};

// Add default export
export default BillSummary;

const styles = StyleSheet.create({
  container: {
    backgroundColor: 'white',
    borderRadius: 20,
    padding: 24,
    margin: 16,
    marginBottom: 40,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 5,
  },
  headerContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: '#3442C6',
    letterSpacing: 0.5,
  },
  summarySection: {
    backgroundColor: '#f7f9ff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  summaryLabel: {
    fontSize: 16,
    color: '#555',
    fontWeight: '500',
  },
  summaryValue: {
    fontSize: 16,
    color: '#333',
    fontWeight: '600',
  },
  divider: {
    height: 1.5,
    backgroundColor: '#eaefff',
    marginBottom: 16,
  },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 8,
    marginBottom: 25,
  },
  totalLabel: {
    fontSize: 19,
    fontWeight: '700',
    color: '#333',
  },
  totalValue: {
    fontSize: 24,
    fontWeight: '800',
    color: '#3442C6',
  },
  buttonContainer: {
    marginTop: 10,
  },
  splitButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    borderRadius: 16,
    backgroundColor: 'white',
    marginBottom: 8,
  },
  buttonIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(52, 66, 198, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  splitByItemButton: {
    borderWidth: 2.5,
    borderColor: '#3442C6',
    backgroundColor: 'white',
    shadowColor: '#3442C6',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 6,
    transform: [{ scale: 1.01 }],
  },
  splitEvenlyButton: {
    borderWidth: 2,
    borderColor: '#4b59d2',
    marginTop: 16,
    backgroundColor: '#f7f9ff',
  },
  splitButtonText: {
    fontSize: 18,
    fontWeight: '700',
    color: '#3442C6',
  },
  buttonDescription: {
    textAlign: 'center',
    color: '#666',
    fontSize: 14,
    marginBottom: 16,
  },
}); 