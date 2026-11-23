import React, { useRef, useEffect } from 'react';
import { View, Text, TouchableOpacity, Animated, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';

const CelebrationView = ({ 
  celebrationScale, 
  celebrationOpacity, 
  confettiY, 
  confettiX, 
  onShare, 
  onShowCurrencyModal, 
  onReset,
  targetCurrency,
  originalCurrency
}) => {
  const pulseAnim = useRef(new Animated.Value(1)).current;
  
  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.05,
          duration: 1000,
          useNativeDriver: true
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 1000,
          useNativeDriver: true
        })
      ])
    ).start();
  }, []);

  return (
    <View style={styles.card}>
      <View style={styles.celebrationContainer}>
        {/* Confetti particles */}
        {confettiX.map((x, index) => (
          <Animated.View 
            key={index}
            style={[
              styles.confetti,
              {
                backgroundColor: ['#FF9500', '#4CDE80', '#3442C6', '#FFD54F', '#FF4F66'][index % 5],
                transform: [
                  { translateY: confettiY },
                  { translateX: x },
                  { rotate: `${index * 30}deg` }
                ],
                opacity: celebrationOpacity
              }
            ]}
          />
        ))}
        
        {/* Success checkmark */}
        <Animated.View style={{
          transform: [{ scale: celebrationScale }],
          opacity: celebrationOpacity
        }}>
          <View style={styles.successCircle}>
            <Ionicons name="checkmark" size={40} color="white" />
          </View>
        </Animated.View>
      </View>
      
      <Animated.Text 
        style={[
          styles.sectionTitle, 
          { 
            opacity: celebrationOpacity,
            transform: [{ scale: Animated.add(0.8, Animated.multiply(celebrationScale, 0.2)) }]
          }
        ]}
      >
        Bill Split Complete!
      </Animated.Text>
      
      <Animated.Text 
        style={[
          styles.completionText,
          { opacity: celebrationOpacity }
        ]}
      >
        All items have been assigned to guests. Review the guest totals below.
      </Animated.Text>
      
      <Animated.View style={[
        styles.shareButton,
        {
          transform: [{ scale: pulseAnim }]
        }
      ]}>
        <TouchableOpacity
          onPress={onShare}
          activeOpacity={0.85}
        >
          <LinearGradient
            colors={['#4CDE80', '#3FCC70']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.shareButtonGradient}
          >
            <Ionicons name="share-outline" size={22} color="white" style={styles.shareIcon} />
            <Text style={styles.shareButtonText}>Share Split Details</Text>
          </LinearGradient>
        </TouchableOpacity>
      </Animated.View>
      
      {/* Currency Converter Button */}
      <View style={styles.currencyButtonsContainer}>
        <TouchableOpacity 
          style={styles.currencyConverterButton}
          onPress={onShowCurrencyModal}
        >
          <Ionicons name="swap-horizontal" size={18} color="white" style={styles.currencyIcon} />
          <Text style={styles.currencyButtonText}>Convert Currency</Text>
        </TouchableOpacity>
        
        {/* Reset button (icon only) */}
        {targetCurrency && targetCurrency !== originalCurrency && (
          <TouchableOpacity
            style={styles.resetIconButton}
            onPress={onReset}
            accessibilityLabel="Reset currency conversion"
          >
            <Ionicons name="refresh-circle" size={28} color="white" />
          </TouchableOpacity>
        )}
      </View>
      
      {/* Show active conversion if applicable */}
      {targetCurrency && targetCurrency !== originalCurrency && (
        <View style={styles.conversionActiveContainer}>
          <View style={styles.currencyBadge}>
            <Text style={styles.currencyBadgeText}>
              {originalCurrency} → {targetCurrency}
            </Text>
          </View>
        </View>
      )}
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
  completionText: {
    textAlign: 'center',
    color: '#666',
    marginVertical: 20,
    fontStyle: 'italic',
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
    backgroundColor: "#8360FF",
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
    backgroundColor: '#FFD54F',
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
    color: '#3442C6',
    fontWeight: '600',
    fontSize: 15,
  },
});

export default CelebrationView; 