import { Text, View, StyleSheet, TextInput, TouchableOpacity, ScrollView, KeyboardAvoidingView, Platform, Alert, Share, SafeAreaView } from "react-native";
import { useState } from "react";
import { StatusBar } from 'expo-status-bar';
import { useRouter, useLocalSearchParams } from 'expo-router';
import Ionicons from '@expo/vector-icons/Ionicons';
import { LinearGradient } from 'expo-linear-gradient';
import { useCurrencyConverter, CurrencyConverterButton, CurrencyConverterModal } from "./CurrencyConverter";
import { currencies } from './utils/currencies';
import SplitEvenlyBillSummary from './split_components/SplitEvenlyBillSummary';
import { useAuth } from './config/AuthContext';

export default function SplitEvenly() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const { userProfile } = useAuth();
  const billData = params.billData ? JSON.parse(params.billData) : null;
  
  const [numPeople, setNumPeople] = useState('2');
  
  // Bill data from params
  const subtotalValue = billData?.subtotal || 0;
  const taxValue = billData?.tax || 0;
  const tipValue = billData?.tip || 0;
  const currencySymbol = billData?.currency_symbol || '$';
  const currencyCode = billData?.currency_code || 'USD';
  
  // Currency conversion setup
  const {
    showCurrencyModal,
    setShowCurrencyModal,
    originalCurrency,
    setOriginalCurrency,
    targetCurrency, 
    setTargetCurrency,
    exchangeRate,
    showOriginalDropdown,
    setShowOriginalDropdown,
    showTargetDropdown,
    setShowTargetDropdown,
    originalSearchQuery,
    setOriginalSearchQuery,
    targetSearchQuery,
    setTargetSearchQuery,
    convertCurrency
  } = useCurrencyConverter(currencyCode);
  
  // Calculate totals
  const totalValue = subtotalValue + taxValue + tipValue;
  const perPersonAmount = totalValue / (parseInt(numPeople) || 1);
  
  // Format amount without currency symbol
  const formatAmount = (amount) => {
    return parseFloat(amount).toFixed(2);
  };
  
  // Format currency with appropriate symbol (only for converted currency)
  const formatBillCurrency = (amount, isTotal = false) => {
    if (isTotal) {
      // For totals, use the appropriate symbol
      if (originalCurrency && targetCurrency && targetCurrency !== originalCurrency) {
        // Original total with original currency symbol
        return `${currencySymbol}${formatAmount(amount)}`;
      } else {
        // No conversion, just use original currency
        return `${currencySymbol}${formatAmount(amount)}`;
      }
    } else {
      // For non-totals (subtotal, tax, tip), just return the number without symbol
      return formatAmount(amount);
    }
  };
  
  // Get currency symbol helper
  const getCurrencySymbol = (currencyCode) => {
    const currency = currencies.find(c => c.code === currencyCode);
    return currency ? currency.symbol : '$';
  };
  
  // Create share message
  const formatDetailsForSharing = () => {
    const isConverted = originalCurrency && targetCurrency && targetCurrency !== originalCurrency;
    
    let conversionInfo = '';
    if (isConverted) {
      conversionInfo = `\nCURRENCY CONVERSION\n` +
                       `------------------------------\n` +
                       `${originalCurrency} to ${targetCurrency} @ ${exchangeRate.toFixed(4)}\n`;
    }

    // Format per-person amount with correct currency symbol or code
    const formattedPerPersonAmount = isConverted
      ? `${getCurrencySymbol(targetCurrency)}${formatAmount(perPersonAmount * exchangeRate)}`
      : `${formatAmount(perPersonAmount)}`;

    // Format total with correct currency representation
    const formattedTotal = isConverted
      ? `${formatAmount(totalValue)} (${getCurrencySymbol(targetCurrency)}${formatAmount(totalValue * exchangeRate)})`
      : formatAmount(totalValue);

    // Currency code to display when not converting
    const currencyCode = !isConverted && originalCurrency ? ` ${originalCurrency}` : '';

    return `PAYMENT REQUEST\n\n` +
           `You guys all owe me ${formattedPerPersonAmount}${currencyCode} each for our meal.\n\n` +
           `Bill Details:\n` +
           `------------------------------\n` +
           `Subtotal: ${formatAmount(subtotalValue)}\n` +
           `Tax: ${formatAmount(taxValue)}\n` +
           `Tip: ${formatAmount(tipValue)}\n` +
           `Total: ${formattedTotal}${currencyCode}\n` +
           `${conversionInfo}\n` +
           `Split between ${numPeople} people\n` +
           (userProfile?.venmoUsername ? `Pay me on Venmo: https://venmo.com/u/${userProfile.venmoUsername}\n\n` : `Please Venmo or pay in cash!\n\n`) +
           `Sent via Flick2Split`;
  };
  
  // Share bill details
  const handleShare = async () => {
    try {
      const message = formatDetailsForSharing();
      
      await Share.share({
        message: message,
        title: Platform.OS === 'android' ? `Payment Request: ${formatBillCurrency(perPersonAmount)} per person` : undefined
      });
    } catch (error) {
      console.error('Share error:', error);
      Alert.alert('Error', 'Failed to share bill details');
    }
  };
  
  // Add reset handler function
  const handleReset = () => {
    // Reset to original currency and clear target currency
    setOriginalCurrency(currencyCode);
    setTargetCurrency(null);
    
    // Reset any search queries
    setOriginalSearchQuery('');
    setTargetSearchQuery('');
    
    // Ensure exchange rate display is cleared by forcing a re-render
    convertCurrency(currencyCode, null);
    
    // Show brief confirmation
    Alert.alert('Reset Complete', 'Currency conversion has been reset', [
      { text: 'OK', style: 'default' }
    ], { cancelable: true });
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
        <KeyboardAvoidingView 
          behavior={Platform.OS === "ios" ? "padding" : "height"}
          style={styles.container}
        >
          <StatusBar style="light" />
          
          <View style={styles.header}>
            <TouchableOpacity 
              style={styles.backButton}
              onPress={() => router.back()}
            >
              <Ionicons name="arrow-back" size={24} color="white" />
            </TouchableOpacity>
            <Text style={styles.title}>Split Evenly</Text>
          </View>
          
          <ScrollView style={styles.content} contentContainerStyle={styles.contentContainer}>
            {/* Number of People */}
            <View style={styles.card}>
              <Text style={styles.sectionTitle}>Number of People</Text>
              
              <View style={styles.peopleContainer}>
                <TouchableOpacity 
                  style={styles.peopleButton}
                  onPress={() => setNumPeople(Math.max(1, parseInt(numPeople || 1) - 1).toString())}
                  disabled={parseInt(numPeople || 1) <= 1}
                >
                  <Ionicons name="remove" size={20} color="white" />
                </TouchableOpacity>
                
                <View style={styles.peopleInputContainer}>
                  <TextInput
                    style={styles.peopleInput}
                    value={numPeople}
                    onChangeText={setNumPeople}
                    keyboardType="number-pad"
                    textAlign="center"
                  />
                  <Text style={styles.peopleLabel}>people</Text>
                </View>
                
                <TouchableOpacity 
                  style={styles.peopleButton}
                  onPress={() => setNumPeople((parseInt(numPeople || 1) + 1).toString())}
                >
                  <Ionicons name="add" size={20} color="white" />
                </TouchableOpacity>
              </View>
            </View>
              
            {/* Bill Summary */}
            <SplitEvenlyBillSummary
              subtotalValue={subtotalValue}
              taxValue={taxValue}
              tipValue={tipValue}
              totalValue={totalValue}
              currencySymbol={currencySymbol}
              originalCurrency={originalCurrency}
              targetCurrency={targetCurrency}
              exchangeRate={exchangeRate}
              formatAmount={formatAmount}
              getCurrencySymbol={getCurrencySymbol}
            />
            
            {/* Per Person Amount */}
            <View style={styles.perPersonCard}>
              <Text style={styles.perPersonTitle}>Each Person Pays</Text>
              <Text style={styles.perPersonAmount}>
                {originalCurrency && targetCurrency && targetCurrency !== originalCurrency 
                  ? `${getCurrencySymbol(targetCurrency)}${formatAmount(perPersonAmount * exchangeRate)}`
                  : formatAmount(perPersonAmount)}
              </Text>
              <Text style={styles.perPersonSubtext}>
                {numPeople} people
              </Text>
            </View>

            {/* Currency Converter */}
            <View style={styles.currencySection}>
              <View style={styles.currencyHeader}>
                <CurrencyConverterButton 
                  onPress={() => setShowCurrencyModal(true)} 
                  style={styles.convertButton}
                />
                {targetCurrency && targetCurrency !== originalCurrency && (
                  <TouchableOpacity
                    style={styles.resetButton}
                    onPress={handleReset}
                    accessibilityLabel="Reset currency conversion"
                  >
                    <Ionicons name="refresh-circle" size={24} color="#ffffff" />
                  </TouchableOpacity>
                )}
              </View>
            </View>
            
            {/* Share Button */}
            <TouchableOpacity
              style={styles.shareButton}
              onPress={handleShare}
            >
              <Ionicons name="share-outline" size={22} color="white" style={styles.shareIcon} />
              <Text style={styles.shareButtonText}>Share Split Details</Text>
            </TouchableOpacity>

            {/* Currency Converter Modal */}
            <CurrencyConverterModal
              visible={showCurrencyModal}
              onClose={() => setShowCurrencyModal(false)}
              originalCurrency={originalCurrency}
              onOriginalCurrencySelect={setOriginalCurrency}
              targetCurrency={targetCurrency}
              onTargetCurrencySelect={setTargetCurrency}
              onConvert={convertCurrency}
              showOriginalDropdown={showOriginalDropdown}
              setShowOriginalDropdown={setShowOriginalDropdown}
              showTargetDropdown={showTargetDropdown}
              setShowTargetDropdown={setShowTargetDropdown}
              originalSearchQuery={originalSearchQuery}
              setOriginalSearchQuery={setOriginalSearchQuery}
              targetSearchQuery={targetSearchQuery}
              setTargetSearchQuery={setTargetSearchQuery}
            />
          </ScrollView>
        </KeyboardAvoidingView>
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
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingTop: 30,
    paddingBottom: 10,
    paddingHorizontal: 20,
  },
  backButton: {
    marginRight: 15,
    width: 30,
    height: 30,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
  },
  title: {
    fontSize: 25,
    fontWeight: "800",
    color: "white",
    letterSpacing: 0.5,
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    padding: 20,
    paddingBottom: 30,
  },
  card: {
    backgroundColor: "rgba(255, 255, 255, 0.1)",
    borderRadius: 20,
    padding: 20,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.2)",
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "white",
    marginBottom: 15,
    marginTop: 5,
  },
  peopleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 30,
  },
  peopleInputContainer: {
    flex: 1,
    alignItems: 'center',
    marginHorizontal: 15,
  },
  peopleInput: {
    fontSize: 36,
    fontWeight: "700",
    color: "white",
    textAlign: 'center',
    width: '100%',
  },
  peopleLabel: {
    fontSize: 14,
    color: "rgba(255, 255, 255, 0.7)",
    marginTop: 5,
  },
  peopleButton: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: "rgba(255, 255, 255, 0.15)",
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.3)",
  },
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
  perPersonCard: {
    backgroundColor: "rgba(76, 222, 128, 0.2)",
    borderRadius: 20,
    padding: 25,
    marginBottom: 25,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: "rgba(76, 222, 128, 0.5)",
  },
  perPersonTitle: {
    fontSize: 18,
    color: "white",
    fontWeight: "600",
    marginBottom: 15,
  },
  perPersonAmount: {
    fontSize: 38,
    color: "white",
    fontWeight: "900",
    marginBottom: 5,
  },
  perPersonSubtext: {
    fontSize: 14,
    color: "rgba(255, 255, 255, 0.7)",
    fontWeight: "500",
  },
  shareButton: {
    backgroundColor: "#4CDE80",
    borderRadius: 30,
    padding: 18,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  shareIcon: {
    marginRight: 10,
  },
  shareButtonText: {
    fontSize: 18,
    fontWeight: "700",
    color: "white",
  },
  currencySection: {
    marginBottom: 15,
  },
  currencyHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  convertButton: {
    // Add appropriate styles for the convert button
  },
  resetButton: {
    marginLeft: 10,
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.3)',
  },
  resetTooltip: {
    position: 'absolute',
    right: 30,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
    fontSize: 12,
    color: "white",
    width: 90,
    textAlign: 'center',
    opacity: 0.8,
  },
  conversionInfo: {
    marginTop: 8,
    backgroundColor: "rgba(255, 255, 255, 0.1)",
    borderRadius: 8,
    padding: 8,
  },
  conversionText: {
    fontSize: 14,
    color: "rgba(255, 255, 255, 0.9)",
    fontWeight: "500",
    textAlign: 'center',
  },
});