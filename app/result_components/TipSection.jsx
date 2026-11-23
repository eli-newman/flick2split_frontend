import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, TextInput } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

/**
 * TipSection component for handling tip calculations and selection
 */
export const TipSection = ({
  bill,
  selectedTipPercent,
  editingTipAmount,
  setEditingTipAmount,
  formatCurrency,
  selectTipPercent,
  handleCustomTipChange,
  onTipSelect
}) => {
  // Local state to track the text input value before converting to number
  const [localTipText, setLocalTipText] = useState(bill.tip?.toString() || "0");
  const [tipError, setTipError] = useState('');
  const [tipWarning, setTipWarning] = useState('');

  // Validate a tip value. Returns { valid, error, warning, sanitized }.
  // Allows transient/partial input ('', '.', '0.') to pass through without
  // an error so users can keep typing decimals.
  const validateTipInput = (text) => {
    const subtotal = parseFloat(bill.subtotal) || 0;

    if (text === '' || text === '.' || text === '0.') {
      return { valid: true, error: '', warning: '', sanitized: text };
    }

    // Replace commas with periods to mirror handleCustomTipChange's behavior
    const sanitized = text.replace(',', '.');

    if (isNaN(sanitized) || sanitized.trim() === '') {
      return { valid: false, error: 'Enter a valid number', warning: '', sanitized };
    }

    const value = parseFloat(sanitized);
    if (Number.isNaN(value)) {
      return { valid: false, error: 'Enter a valid number', warning: '', sanitized };
    }
    if (value < 0) {
      return { valid: false, error: 'Tip cannot be negative', warning: '', sanitized };
    }
    if (subtotal > 0 && value > subtotal) {
      return {
        valid: false,
        error: `Tip cannot exceed subtotal (${formatCurrency(subtotal)})`,
        warning: '',
        sanitized,
      };
    }

    let warning = '';
    if (subtotal > 0 && value > subtotal * 0.5) {
      warning = "That's more than 50% of the subtotal — are you sure?";
    }
    return { valid: true, error: '', warning, sanitized };
  };

  // Handle text changes in the custom tip input
  const handleTipTextChange = (text) => {
    // Store the current text input (including partially typed decimals)
    setLocalTipText(text);

    const { valid, error, warning } = validateTipInput(text);
    setTipError(error);
    setTipWarning(warning);

    if (!valid) {
      // Ignore invalid values — don't propagate to parent
      return;
    }

    // Pass the text value to the parent handler
    handleCustomTipChange(text);

    // Check if we should scroll
    const numValue = parseFloat(text);
    if (!isNaN(numValue) && numValue > 0 && onTipSelect) {
      setTimeout(() => onTipSelect(), 300);
    }
  };

  const commitCustomTip = () => {
    const { valid } = validateTipInput(localTipText);
    if (valid) {
      handleCustomTipChange(localTipText);
    }
    setEditingTipAmount(false);
  };
  
  return (
    <View style={styles.card}>
      <Text style={styles.sectionTitle}>Add Tip</Text>
      
      <View style={styles.tipOptionsContainer}>
        <Text style={styles.tipPrompt}>Select a tip percentage or enter a custom amount:</Text>
        
        <View style={styles.tipButtonsContainer}>
          <TouchableOpacity
            style={[
              styles.tipButton,
              selectedTipPercent === 0 && styles.tipButtonSelected
            ]}
            onPress={() => {
              setTipError('');
              setTipWarning('');
              selectTipPercent(0);
              if (onTipSelect) onTipSelect();
            }}
            activeOpacity={0.7}
          >
            <Text style={[
              styles.tipButtonText,
              selectedTipPercent === 0 && styles.tipButtonTextSelected
            ]}>No Tip</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.tipButton,
              selectedTipPercent === 15 && styles.tipButtonSelected
            ]}
            onPress={() => {
              setTipError('');
              setTipWarning('');
              selectTipPercent(15);
              if (onTipSelect) onTipSelect();
            }}
            activeOpacity={0.7}
          >
            <Text style={[
              styles.tipButtonText,
              selectedTipPercent === 15 && styles.tipButtonTextSelected
            ]}>15%</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.tipButton,
              selectedTipPercent === 20 && styles.tipButtonSelected
            ]}
            onPress={() => {
              setTipError('');
              setTipWarning('');
              selectTipPercent(20);
              if (onTipSelect) onTipSelect();
            }}
            activeOpacity={0.7}
          >
            <Text style={[
              styles.tipButtonText,
              selectedTipPercent === 20 && styles.tipButtonTextSelected
            ]}>20%</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.customTipSection}>
          <Text style={styles.customTipLabel}>Custom Tip:</Text>
          
          <View style={styles.customTipInputContainer}>
            {editingTipAmount ? (
              <TextInput
                style={styles.customTipInput}
                value={localTipText}
                keyboardType="decimal-pad"
                autoFocus
                onChangeText={handleTipTextChange}
                onBlur={commitCustomTip}
                onSubmitEditing={commitCustomTip}
              />
            ) : (
              <TouchableOpacity
                style={styles.customTipButton}
                onPress={() => {
                  // Initialize local text state with current tip value when editing begins
                  setLocalTipText(bill.tip?.toString() || "0");
                  setTipError('');
                  setTipWarning('');
                  setEditingTipAmount(true);
                }}
                activeOpacity={0.7}
              >
                <Text style={styles.customTipText}>
                  {formatCurrency(bill.tip || 0)}
                </Text>
                <Ionicons name="pencil" size={14} color="white" style={styles.tipEditIcon} />
              </TouchableOpacity>
            )}
          </View>
        </View>

        {tipError ? (
          <Text style={styles.tipErrorText}>{tipError}</Text>
        ) : tipWarning ? (
          <Text style={styles.tipWarningText}>{tipWarning}</Text>
        ) : null}
      </View>
      
      {(selectedTipPercent !== null || bill.tip > 0) && (
        <View style={styles.tipSummary}>
          <Text style={styles.tipCalculationText}>
            {selectedTipPercent !== null 
              ? `${selectedTipPercent}% of ${formatCurrency(bill.subtotal)}`
              : `${((bill.tip / bill.subtotal) * 100).toFixed(1)}% of ${formatCurrency(bill.subtotal)}`
            }
          </Text>
          <Text style={styles.tipAmountText}>= {formatCurrency(bill.tip || 0)}</Text>
        </View>
      )}
    </View>
  );
};

// Add default export
export default TipSection;

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
    marginTop: 5,
  },
  tipOptionsContainer: {
    marginBottom: 15,
  },
  tipPrompt: {
    fontSize: 15,
    color: 'rgba(255, 255, 255, 0.8)',
    marginBottom: 15,
  },
  tipButtonsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 15,
  },
  tipButton: {
    flex: 1,
    minWidth: 70,
    paddingVertical: 15,
    paddingHorizontal: 8,
    backgroundColor: "rgba(255, 255, 255, 0.15)",
    borderRadius: 12,
    marginHorizontal: 4,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.3)",
  },
  tipButtonSelected: {
    backgroundColor: "rgba(76, 222, 128, 0.4)",
    borderColor: "rgba(76, 222, 128, 0.8)",
  },
  tipButtonText: {
    fontWeight: '600',
    fontSize: 16,
    color: 'white',
  },
  tipButtonTextSelected: {
    fontWeight: '800',
  },
  customTipSection: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 10,
    marginBottom: 15,
    paddingTop: 15,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.2)',
  },
  customTipLabel: {
    fontWeight: '600',
    fontSize: 16,
    color: 'white',
    marginRight: 12,
    width: 100,
  },
  customTipInputContainer: {
    flex: 1,
  },
  customTipInput: {
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.3)',
    borderRadius: 12,
    paddingVertical: 15,
    paddingHorizontal: 12,
    textAlign: 'center',
    fontSize: 16,
    fontWeight: '600',
    color: 'white',
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
  },
  customTipButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 15,
    paddingHorizontal: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.3)',
  },
  customTipText: {
    fontWeight: '600',
    fontSize: 16,
    color: 'white',
  },
  tipEditIcon: {
    marginLeft: 6,
    color: 'white',
  },
  tipSummary: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    borderRadius: 12,
    padding: 15,
    marginTop: 10,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  tipCalculationText: {
    color: 'rgba(255, 255, 255, 0.8)',
    fontSize: 16,
  },
  tipAmountText: {
    fontWeight: '700',
    fontSize: 18,
    color: 'white',
  },
  tipErrorText: {
    color: '#ffb3b3',
    fontSize: 13,
    fontWeight: '500',
    marginTop: 4,
  },
  tipWarningText: {
    color: '#ffd27a',
    fontSize: 13,
    fontWeight: '500',
    marginTop: 4,
  },
});