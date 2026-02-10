import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  FlatList,
  Modal,
  ScrollView,
  Alert,
  Share,
  Animated,
  Easing,
  SafeAreaView
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useCurrencyConverter, CurrencyConverterButton, CurrencyConverterModal } from "./CurrencyConverter";
import { currencies } from './utils/currencies';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useAuth } from './config/AuthContext';

// Import custom components
import Header from './split_components/Header';
import HelpModal from './split_components/HelpModal';
import GuestNameInput from './split_components/GuestNameInput';
import ItemSelection from './split_components/ItemSelection';
import SplitModal from './split_components/SplitModal';
import GuestSummary from './split_components/GuestSummary';
import CelebrationView from './split_components/CelebrationView';

// Import utility functions
import { 
  formatCurrency, 
  formatCurrencyAmount, 
  calculateSubtotal, 
  handleShare as shareDetails 
} from './split_components/text_message';

export default function SplitBill() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const { userProfile } = useAuth();
  
  // Parse the bill data from params
  const [billData, setBillData] = useState(params.billData ? JSON.parse(params.billData) : null);
  
  // State for the current guest
  const [guestName, setGuestName] = useState('');
  const [showNameInput, setShowNameInput] = useState(true);
  const [availableItems, setAvailableItems] = useState([]);
  const [selectedItems, setSelectedItems] = useState([]);
  const [previousGuests, setPreviousGuests] = useState([]);
  const [expandedGuest, setExpandedGuest] = useState(null);
  
  // State for split modal
  const [splitModalVisible, setSplitModalVisible] = useState(false);
  const [itemToSplit, setItemToSplit] = useState(null);
  const [splitCount, setSplitCount] = useState('2');
  const [helpVisible, setHelpVisible] = useState(false);
  
  // Track whether state was restored from AsyncStorage
  const restoredRef = useRef(false);

  // Add animation values
  const celebrationScale = useRef(new Animated.Value(0)).current;
  const celebrationOpacity = useRef(new Animated.Value(0)).current;
  const confettiY = useRef(new Animated.Value(-100)).current;
  const confettiX = useRef(Array(20).fill().map(() => new Animated.Value(0))).current;
  
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
  } = useCurrencyConverter(billData?.currency_code || 'USD');
  
  // Help modal toggle
  const toggleHelp = () => {
    setHelpVisible(!helpVisible);
  };

  // Save split progress to AsyncStorage whenever it changes
  const saveSplitProgress = useCallback(async (guests, available, selected, nameInput, name) => {
    try {
      await AsyncStorage.setItem('splitProgress', JSON.stringify({
        previousGuests: guests,
        availableItems: available,
        selectedItems: selected,
        showNameInput: nameInput,
        guestName: name,
        billDataKey: JSON.stringify(billData?.items),
      }));
    } catch (e) {
      // silent fail
    }
  }, [billData]);

  // Restore split progress on mount
  useEffect(() => {
    (async () => {
      try {
        const saved = await AsyncStorage.getItem('splitProgress');
        if (saved && billData) {
          const progress = JSON.parse(saved);
          // Only restore if it's the same bill
          if (progress.billDataKey === JSON.stringify(billData.items) && progress.previousGuests?.length > 0) {
            restoredRef.current = true;
            setPreviousGuests(progress.previousGuests);
            setAvailableItems(progress.availableItems);
            setSelectedItems(progress.selectedItems);
            setShowNameInput(progress.showNameInput);
            setGuestName(progress.guestName || '');
          }
        }
      } catch (e) {
        // silent fail, will initialize normally
      }
    })();
  }, []);

  // Save progress whenever guests change
  useEffect(() => {
    if (previousGuests.length > 0) {
      saveSplitProgress(previousGuests, availableItems, selectedItems, showNameInput, guestName);
    }
  }, [previousGuests, availableItems, selectedItems, showNameInput, guestName]);

  // Clear saved progress when split is complete (all items assigned)
  useEffect(() => {
    if (availableItems.length === 0 && previousGuests.length > 0) {
      AsyncStorage.removeItem('splitProgress');
    }
  }, [availableItems.length, previousGuests.length]);

  // Initialize available items from bill data and recalculate subtotal
  useEffect(() => {
    if (billData) {
      // Skip initialization if state was restored from AsyncStorage
      if (restoredRef.current) {
        restoredRef.current = false; // Reset so future billData changes work
        // Still recalculate subtotal if needed
        const recalculatedSubtotal = billData.items.reduce((sum, item) => sum + item.price, 0);
        if (billData.subtotal !== recalculatedSubtotal) {
          setBillData(prev => ({
            ...prev,
            subtotal: recalculatedSubtotal
          }));
        }
        return;
      }

      // Create expanded items array based on quantities
      let expandedItems = [];
      let recalculatedSubtotal = 0;

      billData.items.forEach((item, index) => {
        const quantity = parseInt(item.quantity) || 1;
        const pricePerItem = item.price / quantity;
        recalculatedSubtotal += item.price;

        for (let i = 0; i < quantity; i++) {
          expandedItems.push({
            ...item,
            id: `item-${index}-${i}`,
            originalId: `item-${index}`,
            isSplit: false,
            splitPart: null,
            splitTotal: null,
            quantity: 1,
            price: pricePerItem
          });
        }
      });

      // Update available items without triggering a re-render of billData
      setAvailableItems(expandedItems);

      // Only update billData if subtotal has changed
      if (billData.subtotal !== recalculatedSubtotal) {
        setBillData(prev => ({
          ...prev,
          subtotal: recalculatedSubtotal
        }));
      }
    }
  }, [billData?.items]); // Only depend on billData.items
  
  const handleNextAfterName = () => {
    if (!guestName.trim()) {
      Alert.alert("Name Required", "Please enter a guest name to continue.");
      return;
    }
    
    // Check if the name already exists in previousGuests
    if (previousGuests.some(guest => guest.name.toLowerCase() === guestName.trim().toLowerCase())) {
      Alert.alert("Duplicate Name", "A guest with this name already exists. Please use a different name.");
      return;
    }
    
    setShowNameInput(false);
  };
  
  const toggleItemSelection = (itemId) => {
    const item = availableItems.find(item => item.id === itemId);
    
    if (selectedItems.some(i => i.id === itemId)) {
      // Remove from selected
      setSelectedItems(selectedItems.filter(i => i.id !== itemId));
    } else {
      // Add to selected
      setSelectedItems([...selectedItems, item]);
    }
  };
  
  const openSplitModal = (item) => {
    setItemToSplit(item);
    setSplitModalVisible(true);
  };
  
  const handleSplitItem = () => {
    const count = parseInt(splitCount);
    if (isNaN(count) || count < 2) {
      Alert.alert("Invalid Input", "Please enter a number greater than 1.");
      return;
    }
    
    // Remove the original item from available and selected items
    const updatedAvailable = availableItems.filter(item => item.id !== itemToSplit.id);
    const updatedSelected = selectedItems.filter(item => item.id !== itemToSplit.id);
    
    // Create split items
    const splitItems = [];
    const splitPrice = itemToSplit.price / count;
    
    for (let i = 1; i <= count; i++) {
      splitItems.push({
        ...itemToSplit,
        id: `${itemToSplit.id}-split-${i}`,
        originalId: itemToSplit.originalId,
        name: `${i}/${count} ${itemToSplit.name}`,
        price: splitPrice,
        isSplit: true,
        splitPart: i,
        splitTotal: count
      });
    }
    
    // Add split items to available items
    const insertIndex = updatedAvailable.findIndex(item => 
      item.originalId === itemToSplit.originalId && item.isSplit
    );
    
    if (insertIndex !== -1) {
      // Insert after the last split item from the same original
      let lastSplitIndex = insertIndex;
      while (
        lastSplitIndex + 1 < updatedAvailable.length && 
        updatedAvailable[lastSplitIndex + 1].originalId === itemToSplit.originalId &&
        updatedAvailable[lastSplitIndex + 1].isSplit
      ) {
        lastSplitIndex++;
      }
      updatedAvailable.splice(lastSplitIndex + 1, 0, ...splitItems);
    } else {
      // Insert at the position of the original item
      const originalIndex = availableItems.findIndex(item => item.id === itemToSplit.id);
      updatedAvailable.splice(originalIndex, 0, ...splitItems);
    }
    
    setAvailableItems(updatedAvailable);
    setSelectedItems(updatedSelected);
    setSplitModalVisible(false);
  };
  
  // Handle confirming items for current guest
  const confirmGuestItems = () => {
    if (selectedItems.length === 0) {
      Alert.alert("No Items Selected", "Please select at least one item for this guest.");
      return;
    }
    
    // Get guest's portion of the bill
    const guestSubtotal = calculateSubtotal(selectedItems);
    const proportion = guestSubtotal / billData.subtotal;
    
    // Calculate guest's share of tax and tip
    const proportionalTip = billData.tip * proportion;
    const proportionalTax = billData.tax * proportion;
    const guestTotal = guestSubtotal + proportionalTip + proportionalTax;
    
    // Create guest entry with their items and costs
    const newGuest = {
      name: guestName,
      items: selectedItems,
      subtotal: guestSubtotal,
      tip: proportionalTip,
      tax: proportionalTax,
      total: guestTotal
    };
    
    // Add guest to list and update available items
    setPreviousGuests([...previousGuests, newGuest]);
    const remainingItems = availableItems.filter(
      item => !selectedItems.some(selected => selected.id === item.id)
    );
    
    // Reset for next guest
    setAvailableItems(remainingItems);
    setSelectedItems([]);
    setShowNameInput(true);
    setGuestName('');
  };
  
  const toggleGuestDetails = (index) => {
    if (expandedGuest === index) {
      setExpandedGuest(null);
    } else {
      setExpandedGuest(index);
    }
  };
  
  // Format guest details for sharing
  const handleShare = async () => {
    await shareDetails(
      previousGuests,
      billData,
      targetCurrency,
      originalCurrency,
      exchangeRate,
      Share,
      userProfile?.venmoUsername
    );
  };
  
  // Reset currency conversion
  const handleReset = () => {
    // Reset to original currency and clear target currency
    setOriginalCurrency(billData?.currency_code || 'USD');
    setTargetCurrency(null);
    
    // Reset any search queries
    setOriginalSearchQuery('');
    setTargetSearchQuery('');
    
    // Show brief confirmation
    Alert.alert('Reset Complete', 'Currency conversion has been reset', [
      { text: 'OK', style: 'default' }
    ], { cancelable: true });
  };
  
  // Add animation function
  const playCelebrationAnimation = () => {
    // Reset animation values
    celebrationScale.setValue(0);
    celebrationOpacity.setValue(0);
    confettiY.setValue(-100);
    confettiX.forEach(x => x.setValue(Math.random() * 300 - 150));
    
    // Play animations
    Animated.parallel([
      Animated.timing(celebrationScale, {
        toValue: 1,
        duration: 600,
        useNativeDriver: true,
        easing: Easing.elastic(1.2),
      }),
      Animated.timing(celebrationOpacity, {
        toValue: 1,
        duration: 400,
        useNativeDriver: true,
      }),
      Animated.timing(confettiY, {
        toValue: 400,
        duration: 2000,
        useNativeDriver: true,
      }),
      ...confettiX.map(x => 
        Animated.sequence([
          Animated.delay(Math.random() * 500),
          Animated.timing(x, {
            toValue: Math.random() * 100 - 50,
            duration: 2000,
            useNativeDriver: true,
            easing: Easing.bezier(0.25, 0.1, 0.25, 1),
          })
        ])
      )
    ]).start();
  };
  
  // Trigger animation when all items are assigned
  useEffect(() => {
    if (availableItems.length === 0 && previousGuests.length > 0) {
      playCelebrationAnimation();
    }
  }, [availableItems.length, previousGuests.length]);
  
  if (!billData) {
    return (
      <View style={styles.container}>
        <StatusBar style="light" />
        <Text style={styles.errorText}>No bill data available</Text>
        <TouchableOpacity 
          style={styles.backButton}
          onPress={() => router.replace("/")}
        >
          <Text style={styles.backButtonText}>Go Back</Text>
        </TouchableOpacity>
      </View>
    );
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
        <View style={styles.container}>
          <StatusBar style="light" />
          
          {/* Header Component */}
          <Header 
            title="Split Bill" 
            onBackPress={() => router.back()} 
            onHelpPress={() => setHelpVisible(true)} 
          />

          {/* Help Modal */}
          <HelpModal 
            visible={helpVisible} 
            onClose={() => setHelpVisible(false)} 
          />

          <ScrollView style={styles.content}>
            {availableItems.length > 0 ? (
              // Show guest name input or item selection only if there are items left
              showNameInput ? (
                <GuestNameInput 
                  guestName={guestName} 
                  setGuestName={setGuestName} 
                  onNext={handleNextAfterName} 
                />
              ) : (
                <ItemSelection 
                  guestName={guestName}
                  availableItems={availableItems}
                  selectedItems={selectedItems}
                  onItemSelect={toggleItemSelection}
                  onSplitItem={openSplitModal}
                  onConfirm={confirmGuestItems}
                  formatCurrency={(price) => formatCurrency(price)}
                />
              )
            ) : (
              // Animated celebration card when all items are assigned
              <CelebrationView 
                celebrationScale={celebrationScale}
                celebrationOpacity={celebrationOpacity}
                confettiY={confettiY}
                confettiX={confettiX}
                onShare={handleShare}
                onShowCurrencyModal={() => setShowCurrencyModal(true)}
                onReset={handleReset}
                targetCurrency={targetCurrency}
                originalCurrency={originalCurrency}
              />
            )}
            
            {/* Previous Guests Summary - always show this section */}
            {previousGuests.length > 0 && (
              <GuestSummary 
                guests={previousGuests}
                expandedGuest={expandedGuest}
                toggleGuestDetails={toggleGuestDetails}
                formatCurrencyAmount={(amount) => formatCurrencyAmount(
                  amount, 
                  targetCurrency, 
                  originalCurrency, 
                  billData
                )}
                originalCurrency={originalCurrency}
                targetCurrency={targetCurrency}
                exchangeRate={exchangeRate}
              />
            )}
          </ScrollView>
          
          {/* Split Modal */}
          <SplitModal 
            visible={splitModalVisible}
            onClose={() => setSplitModalVisible(false)}
            splitCount={splitCount}
            setSplitCount={setSplitCount}
            onConfirm={handleSplitItem}
          />
          
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
    backgroundColor: 'transparent',
    paddingTop: 30,
  },
  backgroundElements: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: -1,
  },
  header: {
    paddingHorizontal: 20,
    marginBottom: 15,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
    paddingTop: 0,
    height: 40,
  },
  backButtonSmall: {
    position: 'absolute',
    left: 20,
    padding: 5,
    zIndex: 1,
  },
  helpButton: {
    position: 'absolute',
    right: 20,
    padding: 5,
    zIndex: 1,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: 'white',
    textAlign: 'center',
  },
  content: {
    paddingHorizontal: 20,
  },
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
  nameInput: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    marginBottom: 20,
  },
  nextButton: {
    backgroundColor: '#3442C6',
    paddingVertical: 14,
    borderRadius: 30,
    alignItems: 'center',
  },
  nextButtonText: {
    color: 'white',
    fontWeight: '700',
    fontSize: 16,
  },
  itemsList: {
    marginBottom: 20,
  },
  itemRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 12,
    paddingHorizontal: 15,
    backgroundColor: '#f8f8f8',
    borderRadius: 8,
    marginBottom: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
    alignItems: 'center',
  },
  selectedItem: {
    backgroundColor: 'rgba(76, 222, 128, 0.15)',
    borderLeftWidth: 4,
    borderLeftColor: '#4CDE80',
  },
  itemNameContainer: {
    flex: 2,
    flexDirection: 'row',
    alignItems: 'center',
  },
  itemName: {
    color: '#333',
    flex: 1,
  },
  checkmark: {
    marginLeft: 8,
  },
  itemPriceContainer: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'center',
  },
  itemPrice: {
    color: '#333',
    fontWeight: '500',
  },
  splitButton: {
    padding: 8,
    marginLeft: 8,
  },
  buttonContainer: {
    marginTop: 10,
  },
  confirmButton: {
    backgroundColor: '#4CDE80',
    paddingVertical: 14,
    borderRadius: 30,
    alignItems: 'center',
  },
  confirmButtonText: {
    color: 'white',
    fontWeight: '700',
    fontSize: 16,
  },
  noItemsText: {
    textAlign: 'center',
    color: '#666',
    marginVertical: 20,
    fontStyle: 'italic',
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
  modalOverlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    padding: 20,
  },
  modalContent: {
    backgroundColor: 'white',
    padding: 30,
    borderRadius: 20,
    width: '90%',
    maxWidth: 400,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.3,
    shadowRadius: 20,
    elevation: 10,
  },
  modalTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 25,
    color: '#3442C6',
    textAlign: 'center',
  },
  helpSection: {
    marginBottom: 22,
    width: '100%',
  },
  helpSectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 8,
    color: '#3442C6',
  },
  helpText: {
    fontSize: 16,
    lineHeight: 22,
    color: '#444',
  },
  closeButton: {
    backgroundColor: '#3442C6',
    paddingVertical: 14,
    paddingHorizontal: 40,
    borderRadius: 30,
    marginTop: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 5,
  },
  closeButtonText: {
    color: 'white',
    fontWeight: 'bold',
    fontSize: 16,
    textAlign: 'center',
  },
  splitInput: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    fontSize: 18,
    width: '50%',
    textAlign: 'center',
    marginBottom: 20,
  },
  modalButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
  },
  modalCancelButton: {
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#ddd',
    flex: 1,
    marginRight: 10,
    alignItems: 'center',
  },
  modalCancelText: {
    color: '#666',
  },
  modalConfirmButton: {
    backgroundColor: '#3442C6',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 8,
    flex: 1,
    marginLeft: 10,
    alignItems: 'center',
  },
  modalConfirmText: {
    color: 'white',
    fontWeight: '600',
  },
  backButton: {
    backgroundColor: 'white',
    paddingVertical: 16,
    paddingHorizontal: 40,
    borderRadius: 30,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 5,
  },
  backButtonText: {
    color: '#3442C6',
    fontWeight: '700',
    fontSize: 18,
  },
  errorText: {
    color: 'white',
    fontSize: 18,
    textAlign: 'center',
    marginBottom: 20,
    paddingHorizontal: 30,
  },
  completionText: {
    textAlign: 'center',
    color: '#666',
    marginVertical: 20,
    fontStyle: 'italic',
  },
  shareButton: {
    width: '100%',
    marginTop: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
    borderRadius: 30,
  },
  shareButtonGradient: {
    flexDirection: 'row',
    paddingVertical: 16,
    borderRadius: 30,
    alignItems: 'center',
    justifyContent: 'center',
  },
  shareIcon: {
    marginRight: 10,
  },
  shareButtonText: {
    color: 'white',
    fontWeight: '700',
    fontSize: 18,
  },
  currencyButtonsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 15,
  },
  currencyConverterButton: {
    backgroundColor: "#8360FF", // Purple color matching gradient
    borderRadius: 25,
    padding: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
    flex: 1,
  },
  resetIconButton: {
    backgroundColor: "white",
    borderRadius: 30,
    width: 50,
    height: 50,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 3,
    elevation: 2,
  },
  currencyIcon: {
    marginRight: 8,
  },
  currencyButtonText: {
    fontSize: 16,
    fontWeight: "600",
    color: "white",
  },
  conversionActiveContainer: {
    marginTop: 15,
    alignItems: 'center',
  },
  currencyBadge: {
    backgroundColor: 'rgba(52, 66, 198, 0.15)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: 'rgba(52, 66, 198, 0.3)',
  },
  currencyBadgeText: {
    color: 'white',
    fontWeight: '600',
    fontSize: 15,
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
  celebrationContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
    height: 200,
    marginBottom: 20,
    overflow: 'hidden',
  },
  confetti: {
    position: 'absolute',
    width: 15,
    height: 15,
    borderRadius: 3,
    top: 0,
    left: '50%',
    zIndex: 1,
  },
  successCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#4CDE80',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 8,
    borderWidth: 4,
    borderColor: 'white',
    marginBottom: 20,
  },
}); 

