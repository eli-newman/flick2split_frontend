import { Alert } from 'react-native';
import { currencies } from '../utils/currencies';

// Format currency with appropriate symbol
export const formatCurrencyAmount = (amount, targetCurrency, originalCurrency, billData) => {
  if (targetCurrency && targetCurrency !== originalCurrency) {
    const currencySymbol = getCurrencySymbol(targetCurrency);
    return `${currencySymbol}${parseFloat(amount).toFixed(2)}`;
  }
  return `${billData?.currency_symbol || '$'}${parseFloat(amount).toFixed(2)}`;
};

// Get currency symbol from currencies list
export const getCurrencySymbol = (currencyCode) => {
  const currency = currencies && currencies.find(c => c.code === currencyCode);
  return currency ? currency.symbol : '$';
};

// Format currency value (just the number with 2 decimal places)
export const formatCurrency = (amount) => {
  return parseFloat(amount).toFixed(2);
};

// Calculate subtotal from items
export const calculateSubtotal = (items) => {
  return items.reduce((sum, item) => sum + item.price, 0);
};

// Format guest details for sharing
export const formatGuestDetailsForSharing = (previousGuests, billData, targetCurrency, originalCurrency, exchangeRate, venmoUsername) => {
  if (!previousGuests || previousGuests.length === 0) {
    return "No guests have been added yet.";
  }

  let message = "BILL SPLIT SUMMARY\n\n";

  // Calculate total bill amount
  const totalBillAmount = previousGuests.reduce((sum, guest) => sum + guest.total, 0);

  // Check if currency conversion is active
  const isConverted = targetCurrency && targetCurrency !== originalCurrency;

  // Add quick summary of all guests first
  message += "PAYMENT REQUESTS\n";
  message += "------------------------------\n\n";

  previousGuests.forEach(guest => {
    if (isConverted) {
      const convertedTotal = guest.total * exchangeRate;
      message += `${guest.name} owes ${formatCurrencyAmountForSharing(convertedTotal, targetCurrency, originalCurrency, billData)}\n`;
    } else {
      message += `${guest.name} owes ${formatCurrencyAmountForSharing(guest.total, targetCurrency, originalCurrency, billData)}\n`;
    }
  });

  // Add total bill information
  message += "\nBILL DETAILS\n";
  message += "------------------------------\n";

  // Original currency values
  const originalSymbol = getCurrencySymbol(originalCurrency);

  if (isConverted) {
    message += `Subtotal: ${originalSymbol}${billData.subtotal.toFixed(2)} (${formatCurrencyAmountForSharing(billData.subtotal * exchangeRate, targetCurrency, originalCurrency, billData)})\n`;
    message += `Tax: ${originalSymbol}${billData.tax.toFixed(2)} (${formatCurrencyAmountForSharing(billData.tax * exchangeRate, targetCurrency, originalCurrency, billData)})\n`;
    message += `Tip: ${originalSymbol}${billData.tip.toFixed(2)} (${formatCurrencyAmountForSharing(billData.tip * exchangeRate, targetCurrency, originalCurrency, billData)})\n`;
    message += `Total: ${originalSymbol}${totalBillAmount.toFixed(2)} (${formatCurrencyAmountForSharing(totalBillAmount * exchangeRate, targetCurrency, originalCurrency, billData)})\n`;
  } else {
    message += `Subtotal: ${formatCurrencyAmountForSharing(billData.subtotal, targetCurrency, originalCurrency, billData)}\n`;
    message += `Tax: ${formatCurrencyAmountForSharing(billData.tax, targetCurrency, originalCurrency, billData)}\n`;
    message += `Tip: ${formatCurrencyAmountForSharing(billData.tip, targetCurrency, originalCurrency, billData)}\n`;
    message += `Total: ${formatCurrencyAmountForSharing(totalBillAmount, targetCurrency, originalCurrency, billData)}\n`;
  }

  message += `Split between ${previousGuests.length} people\n\n`;

  // Add conversion info if applicable
  if (isConverted) {
    message += `CURRENCY CONVERSION\n`;
    message += "------------------------------\n";
    message += `${originalCurrency} to ${targetCurrency} @ ${exchangeRate.toFixed(4)}\n\n`;
  }

  // Add detailed breakdown
  message += "DETAILED BREAKDOWN\n";
  message += "------------------------------\n\n";

  previousGuests.forEach(guest => {
    if (isConverted) {
      const convertedTotal = guest.total * exchangeRate;
      message += `${guest.name}'s TOTAL: ${formatCurrencyAmountForSharing(convertedTotal, targetCurrency, originalCurrency, billData)}\n`;
    } else {
      message += `${guest.name}'s TOTAL: ${formatCurrencyAmountForSharing(guest.total, targetCurrency, originalCurrency, billData)}\n`;
    }

    message += "   Items:\n";
    guest.items.forEach(item => {
      message += `   - ${item.name}: ${originalSymbol}${item.price.toFixed(2)}\n`;
    });

    message += `   Subtotal: ${originalSymbol}${guest.subtotal.toFixed(2)}\n`;
    message += `   Tax: ${originalSymbol}${guest.tax.toFixed(2)}\n`;
    message += `   Tip: ${originalSymbol}${guest.tip.toFixed(2)}\n`;

    if (isConverted) {
      message += `   Original Total: ${originalSymbol}${guest.total.toFixed(2)}\n`;
      message += `   Converted Total: ${formatCurrencyAmountForSharing(guest.total * exchangeRate, targetCurrency, originalCurrency, billData)}\n\n`;
    } else {
      message += `   Total: ${formatCurrencyAmountForSharing(guest.total, targetCurrency, originalCurrency, billData)}\n\n`;
    }
  });

  message += "------------------------------\n";
  message += venmoUsername ? `Pay me on Venmo: https://venmo.com/u/${venmoUsername}\n` : "Please Venmo or pay in cash!\n";
  message += "Sent via Flick2Split";

  return message;
};

// Helper function for formatting currency in sharing text
const formatCurrencyAmountForSharing = (amount, targetCurrency, originalCurrency, billData) => {
  if (targetCurrency && targetCurrency !== originalCurrency) {
    const currencySymbol = getCurrencySymbol(targetCurrency);
    return `${currencySymbol}${parseFloat(amount).toFixed(2)}`;
  }
  return `${billData?.currency_symbol || '$'}${parseFloat(amount).toFixed(2)}`;
};

// Handle share button press
export const handleShare = async (previousGuests, billData, targetCurrency, originalCurrency, exchangeRate, Share, venmoUsername) => {
  try {
    if (!previousGuests || previousGuests.length === 0) {
      Alert.alert('No Data', 'There are no guests to share information about.');
      return;
    }

    const message = formatGuestDetailsForSharing(previousGuests, billData, targetCurrency, originalCurrency, exchangeRate, venmoUsername);
    await Share.share({
      message: message,
      title: 'Bill Split Details'
    });
  } catch (error) {
    console.error('Share error:', error);
    Alert.alert('Error', 'Failed to share bill details');
  }
};

export default {
  formatCurrencyAmount,
  getCurrencySymbol,
  formatCurrency,
  calculateSubtotal,
  formatGuestDetailsForSharing,
  handleShare
};
