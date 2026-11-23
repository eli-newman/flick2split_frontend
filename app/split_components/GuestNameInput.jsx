import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ScrollView } from 'react-native';

const GuestNameInput = ({ guestName, setGuestName, onNext, frequentGuests = [], existingGuests = [] }) => {
  const [nameError, setNameError] = useState('');

  // Filter suggestions: not already added this split, matches current input
  const suggestions = frequentGuests.filter(name => {
    const alreadyUsed = existingGuests.some(g => g.toLowerCase() === name.toLowerCase());
    if (alreadyUsed) return false;
    if (!guestName.trim()) return true;
    return name.toLowerCase().includes(guestName.toLowerCase());
  });

  const handleNameChange = (text) => {
    if (nameError) setNameError('');
    setGuestName(text);
  };

  const handleNext = () => {
    if (!guestName || guestName.trim().length === 0) {
      setNameError('Please enter a name');
      return;
    }
    setNameError('');
    onNext();
  };

  return (
    <View style={styles.card}>
      <Text style={styles.sectionTitle}>Enter Guest Name</Text>
      <TextInput
        style={styles.nameInput}
        value={guestName}
        onChangeText={handleNameChange}
        placeholder="Guest Name"
        placeholderTextColor="#999"
        autoFocus
      />
      {nameError ? (
        <Text style={styles.errorText}>{nameError}</Text>
      ) : null}

      {suggestions.length > 0 && (
        <View style={styles.suggestionsContainer}>
          <Text style={styles.suggestionsLabel}>Recent guests</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chipsScroll}>
            {suggestions.map((name, idx) => (
              <TouchableOpacity
                key={idx}
                style={styles.chip}
                onPress={() => {
                  if (nameError) setNameError('');
                  setGuestName(name);
                }}
              >
                <Text style={styles.chipText}>{name}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
      )}

      <TouchableOpacity
        style={styles.nextButton}
        onPress={handleNext}
      >
        <Text style={styles.nextButtonText}>Next</Text>
      </TouchableOpacity>
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
  nameInput: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    marginBottom: 12,
  },
  errorText: {
    color: '#ff5c5c',
    fontSize: 13,
    marginTop: -6,
    marginBottom: 10,
    fontWeight: '500',
  },
  suggestionsContainer: {
    marginBottom: 16,
  },
  suggestionsLabel: {
    fontSize: 12,
    color: '#999',
    fontWeight: '600',
    textTransform: 'uppercase',
    marginBottom: 8,
  },
  chipsScroll: {
    flexDirection: 'row',
  },
  chip: {
    backgroundColor: 'rgba(52, 66, 198, 0.1)',
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 7,
    marginRight: 8,
    borderWidth: 1,
    borderColor: 'rgba(52, 66, 198, 0.2)',
  },
  chipText: {
    color: '#3442C6',
    fontWeight: '600',
    fontSize: 14,
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
});

export default GuestNameInput;
