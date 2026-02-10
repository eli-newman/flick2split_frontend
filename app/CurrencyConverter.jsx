import { View, Text, Modal, TouchableOpacity, StyleSheet, TextInput, Alert, FlatList, ActivityIndicator, SafeAreaView, KeyboardAvoidingView, Platform } from 'react-native';
import { useState } from 'react';
import Ionicons from '@expo/vector-icons/Ionicons';
import { LinearGradient } from 'expo-linear-gradient';
import { currencies, searchCurrencies } from './utils/currencies';
import { httpsCallable } from 'firebase/functions';
import { functions } from './config/firebase';

export const useCurrencyConverter = (initialCurrencyCode = null) => {
  const [showCurrencyModal, setShowCurrencyModal] = useState(false);
  const [originalCurrency, setOriginalCurrency] = useState(null);
  const [targetCurrency, setTargetCurrency] = useState(null);
  const [exchangeRate, setExchangeRate] = useState(1);
  const [showOriginalDropdown, setShowOriginalDropdown] = useState(false);
  const [showTargetDropdown, setShowTargetDropdown] = useState(false);
  const [originalSearchQuery, setOriginalSearchQuery] = useState('');
  const [targetSearchQuery, setTargetSearchQuery] = useState('');
  const [loading, setLoading] = useState(false);

  const getExchangeRate = async (fromCurrency, toCurrency) => {
    if (fromCurrency === toCurrency) {
      return 1;
    }

    try {
      const exchangeRateFn = httpsCallable(functions, 'exchange_rate');
      const result = await exchangeRateFn({ from_currency: fromCurrency, to_currency: toCurrency });
      const rate = result.data?.data?.[toCurrency.toUpperCase()]?.value;
      if (!rate) throw new Error('Exchange rate not found');
      return rate;
    } catch (error) {
      throw error;
    }
  };

  const fetchExchangeRate = async (fromCurrency, toCurrency) => {
    if (fromCurrency === toCurrency) {
      setExchangeRate(1);
      return;
    }

    setLoading(true);
    try {
      const rate = await getExchangeRate(fromCurrency, toCurrency);
      setExchangeRate(rate);
    } catch (error) {
      const msg = error.message || '';
      if (msg.includes('network') || msg.includes('Network') || msg.includes('fetch') || error.code === 'unavailable') {
        Alert.alert('No Internet', 'Currency conversion requires an internet connection. Please check your connection and try again.');
      } else {
        Alert.alert('Conversion Error', 'Unable to get exchange rate. Please try again.');
      }
      setExchangeRate(1);
    } finally {
      setLoading(false);
    }
  };

  const convertCurrency = () => {
    if (!originalCurrency || !targetCurrency) {
      Alert.alert('Error', 'Please select both currencies');
      return;
    }
    if (originalCurrency === targetCurrency) {
      Alert.alert('Error', 'Please select different currencies for conversion');
      return;
    }
    fetchExchangeRate(originalCurrency, targetCurrency);
    setShowCurrencyModal(false);
  };

  const swapCurrencies = () => {
    setOriginalCurrency(targetCurrency);
    setTargetCurrency(originalCurrency);
  };

  return {
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
    convertCurrency,
    loading,
    swapCurrencies
  };
};

export const CurrencyConverterButton = ({ onPress, style }) => (
  <TouchableOpacity
    style={[styles.currencyButton, style]}
    onPress={onPress}
  >
    <Ionicons name="swap-horizontal" size={22} color="white" style={styles.currencyIcon} />
    <Text style={styles.currencyButtonText}>Convert Currency</Text>
  </TouchableOpacity>
);

// Helper function to get currency display label
const getCurrencyLabel = (code) => {
  const currency = currencies.find(c => c.code === code);
  return currency ? `${currency.code} (${currency.symbol})` : code;
};

// Helper to get full currency description
const getCurrencyFull = (code) => {
  const currency = currencies.find(c => c.code === code);
  return currency ? `${currency.code} (${currency.symbol}) ${currency.name}` : code;
};

const ITEM_HEIGHT = 56;

const CurrencyPickerView = ({ title, selectedCurrency, searchQuery, onSearchChange, onSelect, onBack }) => {
  const filtered = searchQuery ? searchCurrencies(searchQuery) : currencies;

  const renderItem = ({ item }) => {
    const isSelected = selectedCurrency === item.code;
    return (
      <TouchableOpacity
        style={[styles.pickerItem, isSelected && styles.pickerItemSelected]}
        onPress={() => onSelect(item.code)}
        activeOpacity={0.6}
      >
        <View style={styles.pickerItemLeft}>
          <Text style={styles.pickerItemCode}>{item.code}</Text>
          <Text style={styles.pickerItemSymbol}>{item.symbol}</Text>
          <Text style={styles.pickerItemName} numberOfLines={1}>{item.name}</Text>
        </View>
        {isSelected && (
          <Ionicons name="checkmark-circle" size={22} color="#4CDE80" />
        )}
      </TouchableOpacity>
    );
  };

  const getItemLayout = (_, index) => ({
    length: ITEM_HEIGHT,
    offset: ITEM_HEIGHT * index,
    index,
  });

  return (
    <View style={styles.pickerContainer}>
      {/* Header */}
      <View style={styles.pickerHeader}>
        <TouchableOpacity onPress={onBack} style={styles.pickerBackButton}>
          <Ionicons name="arrow-back" size={24} color="white" />
        </TouchableOpacity>
        <Text style={styles.pickerTitle}>{title}</Text>
        <View style={{ width: 40 }} />
      </View>

      {/* Search bar */}
      <View style={styles.pickerSearchContainer}>
        <Ionicons name="search" size={18} color="rgba(255, 255, 255, 0.6)" />
        <TextInput
          style={styles.pickerSearchInput}
          placeholder="Search currencies..."
          placeholderTextColor="rgba(255, 255, 255, 0.4)"
          value={searchQuery}
          onChangeText={onSearchChange}
          autoCapitalize="none"
          autoCorrect={false}
        />
        {searchQuery.length > 0 && (
          <TouchableOpacity onPress={() => onSearchChange('')}>
            <Ionicons name="close-circle" size={20} color="rgba(255, 255, 255, 0.6)" />
          </TouchableOpacity>
        )}
      </View>

      {/* Currency list */}
      <FlatList
        data={filtered}
        renderItem={renderItem}
        keyExtractor={(item) => item.code}
        getItemLayout={getItemLayout}
        style={styles.pickerList}
        keyboardShouldPersistTaps="handled"
        ListEmptyComponent={
          <View style={styles.noResultsContainer}>
            <Ionicons name="search-outline" size={40} color="rgba(255, 255, 255, 0.3)" />
            <Text style={styles.noResultsText}>No currencies found</Text>
          </View>
        }
      />
    </View>
  );
};

export const CurrencyConverterModal = ({
  visible,
  onClose,
  originalCurrency,
  onOriginalCurrencySelect,
  targetCurrency,
  onTargetCurrencySelect,
  onConvert,
  showOriginalDropdown,
  setShowOriginalDropdown,
  showTargetDropdown,
  setShowTargetDropdown,
  originalSearchQuery,
  setOriginalSearchQuery,
  targetSearchQuery,
  setTargetSearchQuery,
  loading = false,
  onSwapCurrencies = null
}) => {
  const isPickerOpen = showOriginalDropdown || showTargetDropdown;
  const canConvert = originalCurrency && targetCurrency && originalCurrency !== targetCurrency && !loading;

  return (
    <Modal
      animationType="slide"
      transparent={false}
      visible={visible}
      onRequestClose={onClose}
    >
      <LinearGradient
        colors={['#3442C6', '#5B42E8', '#7451FB', '#8360FF']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.gradientFill}
      >
        <SafeAreaView style={styles.safeArea}>
          <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            style={styles.keyboardView}
          >
            {/* Currency Picker View */}
            {showOriginalDropdown && (
              <CurrencyPickerView
                title="Select Currency"
                selectedCurrency={originalCurrency}
                searchQuery={originalSearchQuery}
                onSearchChange={setOriginalSearchQuery}
                onSelect={(code) => {
                  onOriginalCurrencySelect(code);
                  setShowOriginalDropdown(false);
                  setOriginalSearchQuery('');
                }}
                onBack={() => {
                  setShowOriginalDropdown(false);
                  setOriginalSearchQuery('');
                }}
              />
            )}

            {showTargetDropdown && (
              <CurrencyPickerView
                title="Select Currency"
                selectedCurrency={targetCurrency}
                searchQuery={targetSearchQuery}
                onSearchChange={setTargetSearchQuery}
                onSelect={(code) => {
                  onTargetCurrencySelect(code);
                  setShowTargetDropdown(false);
                  setTargetSearchQuery('');
                }}
                onBack={() => {
                  setShowTargetDropdown(false);
                  setTargetSearchQuery('');
                }}
              />
            )}

            {/* Main View */}
            {!isPickerOpen && (
              <View style={styles.mainView}>
                {/* Header */}
                <View style={styles.modalHeader}>
                  <Text style={styles.modalTitle}>Currency Converter</Text>
                  <TouchableOpacity style={styles.closeButton} onPress={onClose}>
                    <Ionicons name="close" size={26} color="white" />
                  </TouchableOpacity>
                </View>

                {/* Body */}
                <View style={styles.body}>
                  {/* FROM */}
                  <Text style={styles.selectorLabel}>FROM</Text>
                  <TouchableOpacity
                    style={styles.selectorButton}
                    onPress={() => {
                      setShowOriginalDropdown(true);
                      setShowTargetDropdown(false);
                    }}
                    activeOpacity={0.7}
                  >
                    <Text style={[styles.selectorText, !originalCurrency && styles.selectorPlaceholder]} numberOfLines={1}>
                      {originalCurrency ? getCurrencyFull(originalCurrency) : 'Select original currency'}
                    </Text>
                    <Ionicons name="chevron-forward" size={20} color="rgba(255, 255, 255, 0.6)" />
                  </TouchableOpacity>

                  {/* Swap button */}
                  <View style={styles.swapRow}>
                    <TouchableOpacity
                      style={styles.swapButton}
                      onPress={() => {
                        if (onSwapCurrencies) {
                          onSwapCurrencies();
                        } else {
                          // Fallback: swap locally via the select callbacks
                          const temp = originalCurrency;
                          onOriginalCurrencySelect(targetCurrency);
                          onTargetCurrencySelect(temp);
                        }
                      }}
                      activeOpacity={0.7}
                    >
                      <Ionicons name="swap-vertical" size={24} color="white" />
                    </TouchableOpacity>
                  </View>

                  {/* TO */}
                  <Text style={styles.selectorLabel}>TO</Text>
                  <TouchableOpacity
                    style={styles.selectorButton}
                    onPress={() => {
                      setShowTargetDropdown(true);
                      setShowOriginalDropdown(false);
                    }}
                    activeOpacity={0.7}
                  >
                    <Text style={[styles.selectorText, !targetCurrency && styles.selectorPlaceholder]} numberOfLines={1}>
                      {targetCurrency ? getCurrencyFull(targetCurrency) : 'Select target currency'}
                    </Text>
                    <Ionicons name="chevron-forward" size={20} color="rgba(255, 255, 255, 0.6)" />
                  </TouchableOpacity>
                </View>

                {/* Actions */}
                <View style={styles.actions}>
                  <TouchableOpacity
                    style={[styles.convertButton, !canConvert && styles.convertButtonDisabled]}
                    onPress={onConvert}
                    disabled={!canConvert}
                    activeOpacity={0.8}
                  >
                    {loading ? (
                      <ActivityIndicator size="small" color="white" />
                    ) : (
                      <Text style={styles.convertButtonText}>Convert</Text>
                    )}
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={styles.cancelButton}
                    onPress={onClose}
                    activeOpacity={0.8}
                  >
                    <Text style={styles.cancelButtonText}>Cancel</Text>
                  </TouchableOpacity>
                </View>
              </View>
            )}
          </KeyboardAvoidingView>
        </SafeAreaView>
      </LinearGradient>
    </Modal>
  );
};

const styles = StyleSheet.create({
  // --- CurrencyConverterButton (unchanged) ---
  currencyButton: {
    backgroundColor: "rgba(255, 255, 255, 0.1)",
    borderRadius: 30,
    padding: 18,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 15,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.2)",
  },
  currencyIcon: {
    marginRight: 10,
  },
  currencyButtonText: {
    fontSize: 18,
    fontWeight: "700",
    color: "white",
  },

  // --- Full-screen modal shell ---
  gradientFill: {
    flex: 1,
  },
  safeArea: {
    flex: 1,
  },
  keyboardView: {
    flex: 1,
  },

  // --- Main view ---
  mainView: {
    flex: 1,
    paddingHorizontal: 24,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 16,
    paddingBottom: 12,
  },
  modalTitle: {
    fontSize: 24,
    fontWeight: "800",
    color: "white",
  },
  closeButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "rgba(255, 255, 255, 0.15)",
    alignItems: 'center',
    justifyContent: 'center',
  },

  // --- Body (selectors + swap) ---
  body: {
    flex: 1,
    justifyContent: 'center',
    paddingBottom: 40,
  },
  selectorLabel: {
    fontSize: 13,
    fontWeight: "700",
    color: "rgba(255, 255, 255, 0.6)",
    letterSpacing: 1.5,
    marginBottom: 8,
    marginLeft: 4,
  },
  selectorButton: {
    backgroundColor: "rgba(255, 255, 255, 0.12)",
    borderRadius: 20,
    paddingVertical: 18,
    paddingHorizontal: 20,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.18)",
  },
  selectorText: {
    flex: 1,
    fontSize: 17,
    fontWeight: "600",
    color: "white",
    marginRight: 8,
  },
  selectorPlaceholder: {
    color: "rgba(255, 255, 255, 0.45)",
  },

  // --- Swap ---
  swapRow: {
    alignItems: 'center',
    marginVertical: 16,
  },
  swapButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: "rgba(255, 255, 255, 0.18)",
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.25)",
  },

  // --- Action buttons ---
  actions: {
    paddingBottom: 20,
  },
  convertButton: {
    backgroundColor: "#4CDE80",
    borderRadius: 30,
    paddingVertical: 18,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  convertButtonDisabled: {
    backgroundColor: "rgba(76, 222, 128, 0.35)",
  },
  convertButtonText: {
    fontSize: 18,
    fontWeight: "700",
    color: "white",
  },
  cancelButton: {
    backgroundColor: "rgba(255, 255, 255, 0.1)",
    borderRadius: 30,
    paddingVertical: 18,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.2)",
  },
  cancelButtonText: {
    fontSize: 18,
    fontWeight: "700",
    color: "white",
  },

  // --- Picker view ---
  pickerContainer: {
    flex: 1,
  },
  pickerHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 12,
  },
  pickerBackButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "rgba(255, 255, 255, 0.15)",
    alignItems: 'center',
    justifyContent: 'center',
  },
  pickerTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: "white",
  },
  pickerSearchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: "rgba(255, 255, 255, 0.1)",
    borderRadius: 16,
    marginHorizontal: 16,
    marginBottom: 8,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.15)",
  },
  pickerSearchInput: {
    flex: 1,
    color: "white",
    fontSize: 16,
    marginLeft: 10,
    paddingVertical: 0,
  },
  pickerList: {
    flex: 1,
    paddingHorizontal: 16,
  },
  pickerItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    height: ITEM_HEIGHT,
    paddingHorizontal: 16,
    borderRadius: 14,
    marginBottom: 2,
  },
  pickerItemSelected: {
    backgroundColor: "rgba(76, 222, 128, 0.15)",
  },
  pickerItemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginRight: 8,
  },
  pickerItemCode: {
    fontSize: 16,
    fontWeight: "700",
    color: "white",
    width: 48,
  },
  pickerItemSymbol: {
    fontSize: 16,
    color: "rgba(255, 255, 255, 0.7)",
    width: 36,
    textAlign: 'center',
  },
  pickerItemName: {
    fontSize: 15,
    color: "rgba(255, 255, 255, 0.7)",
    flex: 1,
  },

  // --- Empty state ---
  noResultsContainer: {
    paddingVertical: 40,
    alignItems: 'center',
  },
  noResultsText: {
    color: "rgba(255, 255, 255, 0.5)",
    fontSize: 16,
    marginTop: 12,
  },
});

// Default export combining the main components
export default {
  useCurrencyConverter,
  CurrencyConverterButton,
  CurrencyConverterModal
};
