import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, TouchableOpacity, Modal, StyleSheet } from 'react-native';

const MAX_SPLIT_COUNT = 50;

const SplitModal = ({ visible, onClose, splitCount, setSplitCount, onConfirm }) => {
  const [splitError, setSplitError] = useState('');

  // Reset error each time the modal is reopened
  useEffect(() => {
    if (visible) {
      setSplitError('');
    }
  }, [visible]);

  const handleChange = (text) => {
    if (splitError) setSplitError('');
    setSplitCount(text);
  };

  const handleConfirm = () => {
    const raw = (splitCount ?? '').toString().trim();
    if (raw === '') {
      setSplitError('Enter a number');
      return;
    }

    // Reject non-integer input (e.g. "2.5", "abc")
    if (!/^\d+$/.test(raw)) {
      setSplitError('Enter a whole number');
      return;
    }

    const parsed = parseInt(raw, 10);
    if (Number.isNaN(parsed) || parsed < 1) {
      setSplitError('Must be at least 1');
      return;
    }
    if (parsed > MAX_SPLIT_COUNT) {
      setSplitError(`Maximum is ${MAX_SPLIT_COUNT}`);
      return;
    }

    setSplitError('');
    onConfirm();
  };

  return (
    <Modal
      visible={visible}
      transparent={true}
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <Text style={styles.modalTitle}>Split how many ways?</Text>
          <TextInput
            style={styles.splitInput}
            value={splitCount}
            onChangeText={handleChange}
            keyboardType="numeric"
            autoFocus
          />
          {splitError ? (
            <Text style={styles.errorText}>{splitError}</Text>
          ) : null}
          <View style={styles.modalButtons}>
            <TouchableOpacity
              style={styles.modalCancelButton}
              onPress={onClose}
            >
              <Text style={styles.modalCancelText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.modalConfirmButton}
              onPress={handleConfirm}
            >
              <Text style={styles.modalConfirmText}>Split</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
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
  splitInput: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    fontSize: 18,
    width: '50%',
    textAlign: 'center',
    marginBottom: 20,
    alignSelf: 'center',
  },
  errorText: {
    color: '#ff5c5c',
    fontSize: 13,
    fontWeight: '500',
    textAlign: 'center',
    marginTop: -10,
    marginBottom: 15,
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
});

export default SplitModal; 