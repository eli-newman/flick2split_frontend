import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, FlatList, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

const ItemSelection = ({
  guestName,
  availableItems,
  selectedItems,
  onItemSelect,
  onSplitItem,
  onConfirm,
  formatCurrency
}) => {
  const [selectionError, setSelectionError] = useState('');

  // Clear the error as soon as the user picks at least one item
  useEffect(() => {
    if (selectedItems.length > 0 && selectionError) {
      setSelectionError('');
    }
  }, [selectedItems.length, selectionError]);

  const handleConfirm = () => {
    if (!selectedItems || selectedItems.length === 0) {
      setSelectionError('Select at least one item');
      return;
    }
    setSelectionError('');
    onConfirm();
  };

  const hasNoSelection = !selectedItems || selectedItems.length === 0;

  return (
    <View style={styles.card}>
      <Text style={styles.sectionTitle}>Select Items for {guestName}</Text>

      {availableItems.length === 0 ? (
        <Text style={styles.noItemsText}>No items available</Text>
      ) : (
        <FlatList
          data={availableItems}
          keyExtractor={item => item.id}
          renderItem={({ item }) => (
            <TouchableOpacity
              style={[
                styles.itemRow,
                selectedItems.some(i => i.id === item.id) && styles.selectedItem
              ]}
              onPress={() => onItemSelect(item.id)}
            >
              <View style={styles.itemNameContainer}>
                <Text style={styles.itemName}>{item.name}</Text>
                {selectedItems.some(i => i.id === item.id) && (
                  <Ionicons name="checkmark-circle" size={18} color="#4CDE80" style={styles.checkmark} />
                )}
              </View>
              <View style={styles.itemPriceContainer}>
                <Text style={styles.itemPrice}>{formatCurrency(item.price)}</Text>
                {!item.isSplit && (
                  <TouchableOpacity
                    style={styles.splitButton}
                    onPress={() => onSplitItem(item)}
                  >
                    <Ionicons name="git-branch-outline" size={18} color="#3442C6" />
                  </TouchableOpacity>
                )}
              </View>
            </TouchableOpacity>
          )}
          scrollEnabled={false}
          style={styles.itemsList}
        />
      )}

      {selectionError ? (
        <Text style={styles.errorText}>{selectionError}</Text>
      ) : null}

      <View style={styles.buttonContainer}>
        <TouchableOpacity
          style={[styles.confirmButton, hasNoSelection && styles.confirmButtonDisabled]}
          onPress={handleConfirm}
          disabled={hasNoSelection}
        >
          <Text style={styles.confirmButtonText}>Confirm Items</Text>
        </TouchableOpacity>
      </View>
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
  confirmButtonDisabled: {
    backgroundColor: '#b6e8c5',
    opacity: 0.7,
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
  errorText: {
    color: '#ff5c5c',
    fontSize: 13,
    fontWeight: '500',
    textAlign: 'center',
    marginBottom: 10,
  },
});

export default ItemSelection; 