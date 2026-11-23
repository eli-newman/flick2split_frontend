import React, { useEffect, useState, useRef } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert, Platform, Modal, SafeAreaView } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as Sharing from 'expo-sharing';
import { LinearGradient } from 'expo-linear-gradient';

import { useAuth } from './config/AuthContext';
import { logEvent } from './utils/analytics';

// Import modularized components
import { ItemsList } from './result_components/ItemsList';
import { TipSection } from './result_components/TipSection';
import { BillSummary } from './result_components/BillSummary';

/**
 * Results component for displaying and editing bill details
 * Handles item editing, tip calculation, and bill splitting
 */
export default function Results() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const scrollViewRef = useRef(null);
  const { user } = useAuth();
  
  // Initialize bill state from params
  let initialBill = null;
  try {
    initialBill = params.bill ? JSON.parse(params.bill) : null;
  } catch (e) {
    initialBill = null;
  }
  
  // Process initial bill data to ensure prices are numbers
  const processedInitialBill = initialBill ? {
    ...initialBill,
    items: initialBill.items.map(item => ({
      ...item,
      quantity: parseInt(item.quantity) || 1,
      price: parseFloat(item.price) || 0
    })),
    subtotal: parseFloat(initialBill.subtotal) || 0,
    tax: parseFloat(initialBill.tax) || 0,
    tip: parseFloat(initialBill.tip) || 0,
    total: parseFloat(initialBill.total) || 0,
    currency_symbol: initialBill.currency_symbol || '$'
  } : null;
  
  // State management
  const [bill, setBill] = useState(processedInitialBill);
  const [editingItem, setEditingItem] = useState(null);
  const [editingQuantity, setEditingQuantity] = useState(null);
  const [editingName, setEditingName] = useState(null);
  const [selectedTipPercent, setSelectedTipPercent] = useState(null);
  const [editingTipAmount, setEditingTipAmount] = useState(false);
  const [hasTipInteraction, setHasTipInteraction] = useState(false);
  const [itemsConfirmed, setItemsConfirmed] = useState(false);
  const [backPressCount, setBackPressCount] = useState(0);
  const [splitComplete, setSplitComplete] = useState(false);
  const [helpVisible, setHelpVisible] = useState(false);

  // Handle missing bill data
  if (!bill) {
    return (
      <View style={styles.container}>
        <StatusBar style="light" />
        <Text style={styles.errorText}>No bill data available</Text>
        <TouchableOpacity 
          style={styles.tryAgainButton}
          onPress={() => router.replace("/")}
        >
          <Text style={styles.tryAgainButtonText}>Try Again</Text>
        </TouchableOpacity>
      </View>
    );
  }

  /**
   * Format number as currency string using the bill's currency symbol
   */
  const formatCurrency = (amount) => {
    return parseFloat(amount).toFixed(2);
  };

  /**
   * Item update handlers
   */
  const updateItemName = (index, newName) => {
    const original = bill.items[index]?.name;
    const updatedItems = [...bill.items];
    updatedItems[index] = { ...updatedItems[index], name: newName || "Item" };
    setBill(prev => ({ ...prev, items: updatedItems }));
    setEditingName(null);
    if (original !== newName) logEvent(user?.uid, 'bill_edited', { field: 'name', original, corrected: newName });
  };

  const calculateSubtotal = (items) => {
    return items.reduce((sum, item) => {
      return sum + (parseFloat(item.price) || 0) * (parseInt(item.quantity) || 1);
    }, 0);
  };

  const updateItemPrice = (index, newPrice) => {
    const original = bill.items[index]?.price;
    const updatedItems = [...bill.items];
    updatedItems[index] = {
      ...updatedItems[index],
      price: parseFloat(newPrice) || 0
    };
    if (original !== parseFloat(newPrice)) logEvent(user?.uid, 'bill_edited', { field: 'price', original, corrected: parseFloat(newPrice) || 0 });
    
    // Only update subtotal if items are already confirmed
    if (itemsConfirmed) {
      const newSubtotal = calculateSubtotal(updatedItems);
      setBill(prev => ({ 
        ...prev, 
        items: updatedItems,
        subtotal: newSubtotal,
        total: newSubtotal + (prev.tax || 0) + (prev.tip || 0)
      }));
    } else {
      setBill(prev => ({ ...prev, items: updatedItems }));
    }
    setEditingItem(null);
  };

  const updateItemQuantity = (index, newQuantity) => {
    const updatedItems = [...bill.items];
    updatedItems[index] = {
      ...updatedItems[index],
      quantity: newQuantity === '' ? '' : (parseInt(newQuantity) || 1)
    };

    // Only update subtotal if items are already confirmed
    if (itemsConfirmed) {
      const newSubtotal = calculateSubtotal(updatedItems);
      setBill(prev => ({
        ...prev,
        items: updatedItems,
        subtotal: newSubtotal,
        total: newSubtotal + (prev.tax || 0) + (prev.tip || 0)
      }));
    } else {
      setBill(prev => ({ ...prev, items: updatedItems }));
    }
    setEditingQuantity(null);
  };

  /**
   * Tip handling functions
   */
  const updateTip = (newTip) => {
    const tipAmount = parseFloat(newTip) || 0;
    setBill(prev => ({
      ...prev,
      tip: tipAmount,
      total: prev.subtotal + (prev.tax || 0) + tipAmount
    }));
  };

  const selectTipPercent = (percent) => {
    setSelectedTipPercent(percent);
    setEditingTipAmount(false);
    setHasTipInteraction(true);
    const tipAmount = (percent / 100) * bill.subtotal;
    updateTip(tipAmount);
  };

  const handleCustomTipChange = (value) => {
    // Allow decimal input even if parseFloat would return 0
    // This handles cases like "0." or "0.0" during typing
    if (value === '' || value === '.' || value === '0.') {
      setBill(prev => ({
        ...prev,
        tip: 0
      }));
      setSelectedTipPercent(0);
      setHasTipInteraction(true);
      return;
    }
    
    // Replace any commas with periods for international input
    const sanitizedValue = value.replace(',', '.');
    
    // Only update if it's a valid number format
    if (!isNaN(sanitizedValue) && sanitizedValue !== '') {
      const tipAmount = parseFloat(sanitizedValue) || 0;
      updateTip(tipAmount);
      const tipPercent = bill.subtotal > 0 ? ((tipAmount / bill.subtotal) * 100).toFixed(1) : 0;
      setSelectedTipPercent(parseFloat(tipPercent));
      setHasTipInteraction(true);
    }
  };

  /**
   * Item management functions
   */
  const addNewItem = () => {
    const newItem = { 
      name: "", 
      quantity: 1, 
      price: 0 
    };
    setBill(prev => ({
      ...prev,
      items: [...prev.items, newItem]
    }));
    setTimeout(() => setEditingName(bill.items.length), 100);
  };

  /**
   * Navigation and sharing handlers
   */
  const handleSplitBill = () => {
    const billData = {
      items: bill.items,
      subtotal: parseFloat(bill.subtotal),
      tax: parseFloat(bill.tax) || 0,
      tip: parseFloat(bill.tip) || 0,
      total: parseFloat(bill.total),
      currency_symbol: bill.currency_symbol || '$'
    };

    router.push({
      pathname: '/split',
      params: { billData: JSON.stringify(billData) }
    });
    
    setSplitComplete(true);
  };

  /**
   * Navigation handlers for split options
   */
  const handleSplitEvenly = () => {
    const billData = {
      items: bill.items,
      subtotal: parseFloat(bill.subtotal),
      tax: parseFloat(bill.tax) || 0,
      tip: parseFloat(bill.tip) || 0,
      total: parseFloat(bill.total),
      currency_symbol: bill.currency_symbol || '$'
    };

    router.push({
      pathname: '/split-evenly',
      params: { billData: JSON.stringify(billData) }
    });
    
    setSplitComplete(true);
  };
  
  const handleSplitByItem = () => {
    const billData = {
      items: bill.items,
      subtotal: parseFloat(bill.subtotal),
      tax: parseFloat(bill.tax) || 0,
      tip: parseFloat(bill.tip) || 0,
      total: parseFloat(bill.total),
      currency_symbol: bill.currency_symbol || '$'
    };

    router.push({
      pathname: '/split',
      params: { billData: JSON.stringify(billData) }
    });
    
    setSplitComplete(true);
  };

  const handleBackPress = () => {
    if (backPressCount === 0) {
      setBackPressCount(1);
      setTimeout(() => setBackPressCount(0), 2000);
    } else {
      router.replace("/");
    }
  };

  const shareGuestList = async () => {
    try {
      // Check if previousGuests exists before using it
      if (!bill || !bill.items) {
        Alert.alert("Error", "No bill data available to share");
        return;
      }
      
      // Create a summary from the current bill instead of undefined previousGuests
      const billSummary = `Bill Summary\n\nSubtotal: ${formatCurrency(bill.subtotal || 0)}\nTax: ${formatCurrency(bill.tax || 0)}\nTip: ${formatCurrency(bill.tip || 0)}\nTotal: ${formatCurrency(bill.total || 0)}\n\nItems:\n${bill.items.map(item => `- ${item.name}: ${formatCurrency(item.price)}`).join('\n')}`;
      
      // Use proper sharing API for React Native
      await Sharing.shareAsync(
        Platform.OS === 'web' 
          ? URL.createObjectURL(new Blob([billSummary], { type: 'text/plain' }))
          : `data:text/plain;base64,${Buffer.from(billSummary).toString('base64')}`,
        { mimeType: 'text/plain', dialogTitle: 'Share Bill Summary' }
      );
    } catch (error) {
      console.error('Error sharing:', error);
      Alert.alert("Error", "Failed to share bill summary");
    }
  };

  // Add this to handle confirm items
  const handleConfirmItems = () => {
    const newSubtotal = calculateSubtotal(bill.items);
    setBill(prev => ({
      ...prev,
      subtotal: newSubtotal,
      total: newSubtotal + (prev.tax || 0) + (prev.tip || 0)
    }));
    setItemsConfirmed(true);
  };
  
  // Scroll handler to show tip section when items are confirmed
  const scrollToTipSection = () => {
    if (scrollViewRef.current) {
      scrollViewRef.current.scrollToEnd({ animated: true });
    }
  };

  // Help modal toggle
  const toggleHelp = () => {
    setHelpVisible(!helpVisible);
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
              onPress={handleBackPress}
            >
              <Ionicons name="arrow-back" size={24} color="white" />
            </TouchableOpacity>
            <Text style={styles.title}>Review & Edit Receipt</Text>
          </View>

          <TouchableOpacity 
            style={styles.helpButton}
            onPress={toggleHelp}
            activeOpacity={0.7}
          >
            <Ionicons name="help-circle" size={28} color="#FFFFFF" />
          </TouchableOpacity>

          {/* Help Modal */}
          <Modal
            animationType="fade"
            transparent={true}
            visible={helpVisible}
            onRequestClose={toggleHelp}
          >
            <View style={styles.modalOverlay}>
              <View style={styles.modalContent}>
                <Text style={styles.modalTitle}>How to Use:</Text>
                
                <View style={styles.helpSection}>
                  <Text style={styles.helpSectionTitle}>1. Review Items</Text>
                  <Text style={styles.helpText}>Check your receipt items and edit any mistakes. Tap on item name or price to edit.</Text>
                </View>

                <View style={styles.helpSection}>
                  <Text style={styles.helpSectionTitle}>2. Confirm Items</Text>
                  <Text style={styles.helpText}>After reviewing, tap "Confirm Items" to proceed to the next step.</Text>
                </View>

                <View style={styles.helpSection}>
                  <Text style={styles.helpSectionTitle}>3. Add Tip</Text>
                  <Text style={styles.helpText}>Choose a percentage or enter a custom tip amount.</Text>
                </View>

                <View style={styles.helpSection}>
                  <Text style={styles.helpSectionTitle}>4. Split the Bill</Text>
                  <Text style={styles.helpText}>Choose how to split the bill - either evenly among everyone or assign specific items to people.</Text>
                </View>

                <TouchableOpacity 
                  style={styles.closeButton}
                  onPress={toggleHelp}
                >
                  <Text style={styles.closeButtonText}>Got it!</Text>
                </TouchableOpacity>
              </View>
            </View>
          </Modal>

          <ScrollView 
            style={styles.content}
            contentContainerStyle={styles.contentContainer}
            ref={scrollViewRef}
          >
            <ItemsList
              bill={bill}
              setBill={setBill}
              editingItem={editingItem}
              setEditingItem={setEditingItem}
              editingQuantity={editingQuantity}
              setEditingQuantity={setEditingQuantity}
              editingName={editingName}
              setEditingName={setEditingName}
              itemsConfirmed={itemsConfirmed}
              setItemsConfirmed={setItemsConfirmed}
              handleConfirmItems={handleConfirmItems}
              formatCurrency={formatCurrency}
              updateItemName={updateItemName}
              updateItemPrice={updateItemPrice}
              updateItemQuantity={updateItemQuantity}
              addNewItem={addNewItem}
              onConfirmScroll={scrollToTipSection}
            />
            
            {itemsConfirmed ? (
              <TipSection
                bill={bill}
                selectedTipPercent={selectedTipPercent}
                editingTipAmount={editingTipAmount}
                setEditingTipAmount={setEditingTipAmount}
                formatCurrency={formatCurrency}
                selectTipPercent={selectTipPercent}
                handleCustomTipChange={handleCustomTipChange}
                onTipSelect={() => {
                  // No automatic scrolling - let users scroll manually
                }}
              />
            ) : (
              <Text style={styles.confirmPrompt}>Please confirm your items to continue</Text>
            )}

            {hasTipInteraction && (
              <BillSummary
                bill={bill}
                formatCurrency={formatCurrency}
                handleSplitBill={handleSplitByItem}
                handleSplitEvenly={handleSplitEvenly}
                splitComplete={splitComplete}
                shareGuestList={shareGuestList}
              />
            )}
          </ScrollView>
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
    backgroundColor: "transparent",
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
    flexDirection: 'row',
    alignItems: 'center',
    paddingTop: 40,
    paddingBottom: 20,
    paddingHorizontal: 20,
  },
  backButton: {
    marginRight: 15,
    marginTop: -20,
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
  },
  title: {
    flex: 1,
    fontSize: 24,
    fontWeight: "800",
    color: "white",
    letterSpacing: 0.5,
    paddingRight: 40,
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    padding: 20,
    paddingBottom: 30,
  },
  errorText: {
    color: 'white',
    fontSize: 18,
    textAlign: 'center',
    marginBottom: 20,
    paddingHorizontal: 30,
  },
  tryAgainButton: {
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
  tryAgainButtonText: {
    color: '#3442C6',
    fontWeight: '700',
    fontSize: 18,
  },
  confirmPrompt: {
    textAlign: 'center',
    color: 'rgba(255, 255, 255, 0.7)',
    marginTop: 20,
    marginBottom: 40,
    fontSize: 16,
    fontStyle: 'italic',
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
  helpButton: {
    position: 'absolute',
    top: 20,
    right: 15,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 10,
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
}); 