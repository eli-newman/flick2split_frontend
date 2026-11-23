import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, TextInput, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

/**
 * ItemsList component for displaying and editing bill items
 */
export const ItemsList = ({
  bill,
  setBill,
  editingItem,
  setEditingItem,
  editingQuantity,
  setEditingQuantity,
  editingName,
  setEditingName,
  itemsConfirmed,
  setItemsConfirmed,
  handleConfirmItems,
  formatCurrency,
  updateItemName,
  updateItemPrice,
  updateItemQuantity,
  addNewItem,
  onConfirmScroll
}) => {
  // Track confirmation state
  const [confirmationState, setConfirmationState] = useState(0); // 0: not started, 1: first press, 2: confirmed
  const [confirmButtonTimer, setConfirmButtonTimer] = useState(null);

  // Per-row edit validation. Maps row index -> { price?: string, quantity?: string }
  const [rowErrors, setRowErrors] = useState({});
  // Snapshots of the original value when an edit begins, so we can revert on invalid commit
  const [originalPrice, setOriginalPrice] = useState({});
  const [originalQuantity, setOriginalQuantity] = useState({});

  const setRowError = (index, field, message) => {
    setRowErrors(prev => {
      const next = { ...prev };
      const row = { ...(next[index] || {}) };
      if (message) {
        row[field] = message;
      } else {
        delete row[field];
      }
      if (Object.keys(row).length === 0) {
        delete next[index];
      } else {
        next[index] = row;
      }
      return next;
    });
  };

  const commitPriceEdit = (index, rawText) => {
    const text = (rawText ?? '').toString().trim();
    if (text === '' || isNaN(text)) {
      setRowError(index, 'price', 'Enter a valid price');
      // Revert to original
      const prev = originalPrice[index];
      const updatedItems = [...bill.items];
      updatedItems[index] = { ...updatedItems[index], price: prev ?? updatedItems[index].price };
      setBill(b => ({ ...b, items: updatedItems }));
      setEditingItem(null);
      return;
    }
    const value = parseFloat(text);
    if (Number.isNaN(value) || value <= 0) {
      setRowError(index, 'price', 'Price must be greater than 0');
      const prev = originalPrice[index];
      const updatedItems = [...bill.items];
      updatedItems[index] = { ...updatedItems[index], price: prev ?? updatedItems[index].price };
      setBill(b => ({ ...b, items: updatedItems }));
      setEditingItem(null);
      return;
    }
    setRowError(index, 'price', '');
    updateItemPrice(index, text);
  };

  const commitQuantityEdit = (index, rawText) => {
    const text = (rawText ?? '').toString().trim();
    if (text === '' || !/^\d+$/.test(text)) {
      setRowError(index, 'quantity', 'Enter a whole number');
      const prev = originalQuantity[index];
      const updatedItems = [...bill.items];
      updatedItems[index] = { ...updatedItems[index], quantity: prev ?? updatedItems[index].quantity };
      setBill(b => ({ ...b, items: updatedItems }));
      setEditingQuantity(null);
      return;
    }
    const value = parseInt(text, 10);
    if (Number.isNaN(value) || value < 1) {
      setRowError(index, 'quantity', 'Must be at least 1');
      const prev = originalQuantity[index];
      const updatedItems = [...bill.items];
      updatedItems[index] = { ...updatedItems[index], quantity: prev ?? updatedItems[index].quantity };
      setBill(b => ({ ...b, items: updatedItems }));
      setEditingQuantity(null);
      return;
    }
    setRowError(index, 'quantity', '');
    updateItemQuantity(index, text);
  };
  
  // Add validation before confirming items
  const validateAndConfirmItems = () => {
    // First, check if any item is currently being edited
    if (editingItem !== null) {
      // Complete the price edit before confirming
      updateItemPrice(editingItem, bill.items[editingItem].price);
    }
    
    if (editingQuantity !== null) {
      // Complete the quantity edit before confirming
      updateItemQuantity(editingQuantity, bill.items[editingQuantity].quantity);
    }
    
    if (editingName !== null && editingName >= 0 && editingName < bill.items.length) {
      // Complete the name edit before confirming
      updateItemName(editingName, bill.items[editingName].name);
    }
    
    if (!bill.items || bill.items.length === 0) {
      Alert.alert(
        "No Items Found",
        "Please add at least one item before confirming.",
        [{ text: "OK" }]
      );
      return;
    }

    const itemsWithNoPrice = bill.items.filter(item => !item.price || parseFloat(item.price) === 0);
    if (itemsWithNoPrice.length > 0) {
      Alert.alert(
        "Missing Prices",
        `Please add a price or remove ${itemsWithNoPrice.length === 1 ? "this item" : "these items"}.`,
        [{ text: "OK" }]
      );
      return;
    }

    // Clear any pending reset timer from a previous interaction
    if (confirmButtonTimer) {
      clearTimeout(confirmButtonTimer);
      setConfirmButtonTimer(null);
    }

    setConfirmationState(2);

    // Format all prices before confirming
    const updatedItems = bill.items.map(item => {
      // Convert price strings like "01" to proper decimal numbers
      const formattedPrice = parseFloat(parseFloat(item.price).toFixed(2));
      return {
        ...item,
        price: formattedPrice,
        quantity: parseInt(item.quantity) || 1
      };
    });
    
    // Update the bill with formatted prices
    setBill(prev => ({
      ...prev,
      items: updatedItems
    }));

    // Call the confirm items handler
    handleConfirmItems();
    if (onConfirmScroll) onConfirmScroll();
  };
  
  // Allow users to go back and edit items
  const handleEditItems = () => {
    setItemsConfirmed(false);
    setConfirmationState(0);
  };
  
  // Remove an item from the bill
  const removeItem = (index) => {
    Alert.alert(
      "Remove Item",
      "Are you sure you want to remove this item?",
      [
        {
          text: "Cancel",
          style: "cancel"
        },
        {
          text: "Remove",
          onPress: () => {
            const updatedItems = [...bill.items];
            updatedItems.splice(index, 1);
            setBill(prev => ({...prev, items: updatedItems}));
            
            // Reset confirmation state if an item is removed
            setConfirmationState(0);
          },
          style: "destructive"
        }
      ]
    );
  };
  
  // Clean up timer when unmounting
  React.useEffect(() => {
    return () => {
      if (confirmButtonTimer) {
        clearTimeout(confirmButtonTimer);
      }
    };
  }, [confirmButtonTimer]);
  
  return (
    <View style={styles.card}>
      <Text style={styles.sectionTitle}>Receipt Items</Text>
      <View style={styles.itemsContainer}>
        <View style={styles.itemHeader}>
          <Text style={[styles.itemHeaderText, styles.itemNameHeader]}>Item</Text>
          <Text style={[styles.itemHeaderText, styles.itemQuantityHeader]}>Qty</Text>
          <Text style={[styles.itemHeaderText, styles.itemPriceHeader]}>Price</Text>
          {!itemsConfirmed && <View style={styles.actionHeader} />}
        </View>
        
        {bill.items.map((item, index) => (
          <View key={index}>
            <View style={styles.itemRow}>
              <View style={styles.nameWrapper}>
                {editingName === index ? (
                  <TextInput
                    style={styles.nameInput}
                    value={item.name}
                    autoFocus
                    selectTextOnFocus={true}
                    onChangeText={(text) => {
                      const updatedItems = [...bill.items];
                      updatedItems[index] = {
                        ...updatedItems[index],
                        name: text
                      };
                      setBill(prev => ({...prev, items: updatedItems}));
                    }}
                    onBlur={(e) => updateItemName(index, e.nativeEvent.text || "Item")}
                    onSubmitEditing={() => updateItemName(index, bill.items[index].name || "Item")}
                  />
                ) : (
                  <TouchableOpacity
                    style={styles.nameContainer}
                    onPress={() => !itemsConfirmed && setEditingName(index)}
                  >
                    <Text style={styles.itemName}>{item.name}</Text>
                  </TouchableOpacity>
                )}
              </View>

              <View style={styles.quantityWrapper}>
                {editingQuantity === index ? (
                  <TextInput
                    style={styles.quantityInput}
                    value={item.quantity?.toString()}
                    keyboardType="numeric"
                    autoFocus
                    onChangeText={(text) => {
                      if (rowErrors[index]?.quantity) setRowError(index, 'quantity', '');
                      const updatedItems = [...bill.items];
                      updatedItems[index] = {
                        ...updatedItems[index],
                        quantity: text
                      };
                      setBill(prev => ({...prev, items: updatedItems}));
                    }}
                    onBlur={(e) => commitQuantityEdit(index, e.nativeEvent.text)}
                    onSubmitEditing={() => commitQuantityEdit(index, bill.items[index].quantity)}
                  />
                ) : (
                  <TouchableOpacity
                    style={styles.quantityContainer}
                    onPress={() => {
                      if (itemsConfirmed) return;
                      setOriginalQuantity(prev => ({ ...prev, [index]: bill.items[index].quantity }));
                      setEditingQuantity(index);
                    }}
                  >
                    <Text style={styles.itemQuantity}>{item.quantity || 1}</Text>
                  </TouchableOpacity>
                )}
              </View>

              <View style={styles.priceWrapper}>
                {editingItem === index ? (
                  <TextInput
                    style={styles.priceInput}
                    value={item.price === 0 || item.price === "0" ? "" : item.price?.toString()}
                    placeholder="0"
                    placeholderTextColor="#aaa"
                    keyboardType="numeric"
                    autoFocus
                    onChangeText={(text) => {
                      if (rowErrors[index]?.price) setRowError(index, 'price', '');
                      // Remove leading zeros
                      const cleanedText = text.replace(/^0+(?=\d)/, '');
                      const updatedItems = [...bill.items];
                      updatedItems[index] = {
                        ...updatedItems[index],
                        price: cleanedText
                      };
                      setBill(prev => ({...prev, items: updatedItems}));
                    }}
                    onBlur={(e) => commitPriceEdit(index, e.nativeEvent.text)}
                    onSubmitEditing={() => commitPriceEdit(index, bill.items[index].price)}
                  />
                ) : (
                  <TouchableOpacity
                    style={styles.priceContainer}
                    onPress={() => {
                      if (itemsConfirmed) return;
                      setOriginalPrice(prev => ({ ...prev, [index]: bill.items[index].price }));
                      setEditingItem(index);
                    }}
                  >
                    <Text style={styles.itemPrice}>{formatCurrency(item.price)}</Text>
                  </TouchableOpacity>
                )}
              </View>

              {!itemsConfirmed && (
                <TouchableOpacity
                  style={styles.trashButton}
                  onPress={() => removeItem(index)}
                >
                  <Ionicons name="trash-outline" size={16} color="#ff5c5c" />
                </TouchableOpacity>
              )}
            </View>
            {(rowErrors[index]?.price || rowErrors[index]?.quantity) && (
              <Text style={styles.rowErrorText}>
                {rowErrors[index]?.price || rowErrors[index]?.quantity}
              </Text>
            )}
          </View>
        ))}
        
        {!itemsConfirmed && (
          <TouchableOpacity 
            style={styles.addItemButton}
            onPress={addNewItem}
          >
            <Ionicons name="add-circle" size={20} color="#3442C6" />
            <Text style={styles.addItemText}>Add Item</Text>
          </TouchableOpacity>
        )}

        {!itemsConfirmed ? (
          <TouchableOpacity
            style={[
              styles.confirmItemsButton,
              confirmationState === 1 && styles.confirmItemsButtonPressed
            ]}
            onPress={validateAndConfirmItems}
          >
            <Text style={styles.confirmItemsText}>Confirm Items</Text>
          </TouchableOpacity>
        ) : (
          <View style={styles.confirmedSection}>
            <View style={styles.confirmedContainer}>
              <Text style={styles.confirmedText}>
                Items Confirmed
              </Text>
              <Ionicons name="checkmark-circle" size={18} color="#4CDE80" />
            </View>
            
            <TouchableOpacity
              style={styles.editItemsButton}
              onPress={handleEditItems}
            >
              <Ionicons name="create-outline" size={16} color="white" style={styles.editButtonIcon} />
              <Text style={styles.editItemsText}>Edit Items</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>
    </View>
  );
};

// Add default export
export default ItemsList;

const styles = StyleSheet.create({
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
    marginTop: 3,
    
  },
  itemsContainer: {
    marginBottom: 10,
  },
  itemHeader: {
    flexDirection: 'row',
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.2)',
    marginBottom: 10,
    position: 'relative',
    height: 30,
  },
  itemHeaderText: {
    position: 'absolute',
    fontWeight: '600',
    color: 'rgba(255, 255, 255, 0.8)',
  },
  itemNameHeader: {
    left: 16,
  },
  itemQuantityHeader: {
    left: '50%',
  },
  itemPriceHeader: {
    right: 50,
  },
  actionHeader: {
    width: 30,
  },
  itemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 6,
    paddingHorizontal: 16,
    marginVertical: 1,
    borderRadius: 6,
    backgroundColor: 'rgba(255, 255, 255, 0.98)',
    borderWidth: 1,
    borderColor: 'rgba(52, 66, 198, 0.15)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  nameWrapper: {
    flex: 2.5,
    marginRight: 8,
  },
  nameContainer: {
    justifyContent: 'center',
    minHeight: 36,
  },
  itemName: {
    color: '#3442C6',
    fontSize: 15,
    fontWeight: '600',
  },
  nameInput: {
    height: 36,
    borderWidth: 1,
    borderColor: 'rgba(52, 66, 198, 0.3)',
    borderRadius: 8,
    paddingHorizontal: 10,
    color: '#3442C6',
    backgroundColor: 'rgba(52, 66, 198, 0.05)',
    fontSize: 15,
  },
  quantityWrapper: {
    width: 45,
    marginRight: 8,
  },
  quantityContainer: {
    justifyContent: 'center',
    alignItems: 'center',
    height: 36,
    backgroundColor: 'rgba(52, 66, 198, 0.05)',
    borderRadius: 8,
  },
  itemQuantity: {
    color: '#3442C6',
    fontWeight: '600',
    fontSize: 15,
  },
  quantityInput: {
    width: '100%',
    height: 36,
    borderWidth: 1,
    borderColor: 'rgba(52, 66, 198, 0.3)',
    borderRadius: 8,
    paddingHorizontal: 4,
    textAlign: 'center',
    color: '#3442C6',
    backgroundColor: 'rgba(52, 66, 198, 0.05)',
    fontSize: 15,
  },
  priceWrapper: {
    width: 80,
    marginRight: 8,
  },
  priceContainer: {
    justifyContent: 'center',
    alignItems: 'flex-end',
    height: 36,
    backgroundColor: 'rgba(52, 66, 198, 0.05)',
    borderRadius: 8,
    paddingHorizontal: 10,
  },
  itemPrice: {
    color: '#3442C6',
    fontWeight: '600',
    fontSize: 15,
    fontFamily: 'Menlo',
    textAlign: 'right',
  },
  priceInput: {
    width: '100%',
    height: 36,
    borderWidth: 1,
    borderColor: 'rgba(52, 66, 198, 0.3)',
    borderRadius: 8,
    paddingHorizontal: 10,
    textAlign: 'right',
    color: '#3442C6',
    backgroundColor: 'rgba(52, 66, 198, 0.05)',
    fontSize: 15,
    fontFamily: 'Menlo',
  },
  trashButton: {
    width: 20,
    height: 26,
    borderRadius: 8,
    backgroundColor: 'rgba(255, 92, 92, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 92, 92, 0.3)',
    
  },
  addItemButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    marginTop: 10,
    marginHorizontal: 20,
    borderStyle: 'dashed',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.5)',
    borderRadius: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
  },
  addItemText: {
    marginLeft: 6,
    color: 'white',
    fontWeight: '600',
    fontSize: 14,
  },
  confirmItemsButton: {
    backgroundColor: '#4CDE80',
    paddingVertical: 16,
    borderRadius: 30,
    alignItems: 'center',
    marginTop: 20,
    marginHorizontal: 20,
  },
  confirmItemsButtonPressed: {
    backgroundColor: '#3DBE70',
    transform: [{ scale: 0.98 }],
  },
  confirmItemsText: {
    color: 'white',
    fontWeight: '700',
    fontSize: 18,
  },
  confirmedSection: {
    marginTop: 15,
  },
  confirmedContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    backgroundColor: 'rgba(76, 222, 128, 0.1)',
    borderRadius: 10,
    marginBottom: 12,
  },
  confirmedText: {
    color: '#4CDE80',
    fontWeight: '600',
    marginRight: 6,
  },
  editItemsButton: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    borderRadius: 25,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.3)',
  },
  editItemsText: {
    color: 'white',
    fontWeight: '600',
    fontSize: 14,
  },
  editButtonIcon: {
    marginRight: 6,
  },
  rowErrorText: {
    color: '#ff5c5c',
    fontSize: 12,
    fontWeight: '500',
    marginLeft: 16,
    marginTop: 2,
    marginBottom: 4,
  },
}); 