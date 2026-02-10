import { Text, View, TouchableOpacity, StyleSheet, Image, Alert, Dimensions, ActivityIndicator, Modal, Animated } from "react-native";
import { useState, useEffect, useRef } from "react";
import * as ImagePicker from 'expo-image-picker';
import { StatusBar } from 'expo-status-bar';
import * as FileSystem from 'expo-file-system/legacy';
import * as ImageManipulator from 'expo-image-manipulator';
import { useRouter } from 'expo-router';
import { Platform } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { LinearGradient } from 'expo-linear-gradient';
import { SafeAreaView } from 'react-native';
import { httpsCallable } from 'firebase/functions';
import { functions } from './config/firebase';
import { useAuth } from './config/AuthContext';


const { width } = Dimensions.get('window');

/**
 * Main app component for bill splitting application
 * Handles image capture, upload, and processing
 */
export default function Index() {
  const [buttonState, setButtonState] = useState("idle");
  const [image, setImage] = useState(null);
  const [responseData, setResponseData] = useState(null);
  const [helpVisible, setHelpVisible] = useState(false);
  const [errorVisible, setErrorVisible] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const router = useRouter();
  const { userProfile } = useAuth();
  
  // Animation values
  const circle1Animation = useRef(new Animated.Value(0)).current;
  const circle2Animation = useRef(new Animated.Value(0)).current;
  const circle3Animation = useRef(new Animated.Value(0)).current;
  const buttonPulse = useRef(new Animated.Value(1)).current;
  
  // Add shimmer animation for title
  const shimmerAnimation = useRef(new Animated.Value(0)).current;
  
  // Start background animations
  useEffect(() => {
    const animateCircles = () => {
      Animated.loop(
        Animated.sequence([
          Animated.timing(circle1Animation, {
            toValue: 1,
            duration: 15000,
            useNativeDriver: true,
          }),
          Animated.timing(circle1Animation, {
            toValue: 0,
            duration: 15000,
            useNativeDriver: true,
          })
        ])
      ).start();
      
      Animated.loop(
        Animated.sequence([
          Animated.timing(circle2Animation, {
            toValue: 1,
            duration: 18000,
            useNativeDriver: true,
          }),
          Animated.timing(circle2Animation, {
            toValue: 0,
            duration: 18000,
            useNativeDriver: true,
          })
        ])
      ).start();
      
      Animated.loop(
        Animated.sequence([
          Animated.timing(circle3Animation, {
            toValue: 1,
            duration: 20000,
            useNativeDriver: true,
          }),
          Animated.timing(circle3Animation, {
            toValue: 0,
            duration: 20000,
            useNativeDriver: true,
          })
        ])
      ).start();
    };
    
    // Button pulsing animation
    const pulseButton = () => {
      Animated.loop(
        Animated.sequence([
          Animated.timing(buttonPulse, {
            toValue: 1.08,
            duration: 1500,
            useNativeDriver: true,
          }),
          Animated.timing(buttonPulse, {
            toValue: 1,
            duration: 1500,
            useNativeDriver: true,
          }),
        ])
      ).start();
    };
    
    animateCircles();
    pulseButton();
  }, []);
  
  useEffect(() => {
    // Start shimmer animation for title
    Animated.loop(
      Animated.sequence([
        Animated.timing(shimmerAnimation, {
          toValue: 1,
          duration: 2000,
          useNativeDriver: true,
        }),
        Animated.timing(shimmerAnimation, {
          toValue: 0,
          duration: 2000,
          useNativeDriver: true,
        })
      ])
    ).start();
  }, []);
  
  // Transform animations
  const circle1Transform = {
    transform: [
      {
        translateY: circle1Animation.interpolate({
          inputRange: [0, 1],
          outputRange: [0, 30]
        })
      },
      {
        scale: circle1Animation.interpolate({
          inputRange: [0, 1],
          outputRange: [1, 1.1]
        })
      }
    ],
  };
  
  const circle2Transform = {
    transform: [
      {
        translateX: circle2Animation.interpolate({
          inputRange: [0, 1],
          outputRange: [0, -20]
        })
      },
      {
        scale: circle2Animation.interpolate({
          inputRange: [0, 1],
          outputRange: [1, 1.15]
        })
      }
    ],
  };
  
  const circle3Transform = {
    transform: [
      {
        translateY: circle3Animation.interpolate({
          inputRange: [0, 1],
          outputRange: [0, 15]
        })
      },
      {
        translateX: circle3Animation.interpolate({
          inputRange: [0, 1],
          outputRange: [0, 15]
        })
      }
    ],
  };

  // Create shimmer effect interpolation
  const shimmerTranslate = shimmerAnimation.interpolate({
    inputRange: [0, 1],
    outputRange: [-width, width]
  });

  // Reset state on mount/unmount
  useEffect(() => {
    const resetState = () => {
      setImage(null);
      setButtonState("idle");
      setResponseData(null);
    };
    resetState();
    return resetState;
  }, []);

  // Request permissions on mount
  useEffect(() => {
    (async () => {
      try {
        const [camera, media] = await Promise.all([
          ImagePicker.requestCameraPermissionsAsync(),
          ImagePicker.requestMediaLibraryPermissionsAsync()
        ]);

        if (camera.status !== 'granted' || media.status !== 'granted') {
          alert('Sorry, we need permissions to make this work!');
        }
      } catch (error) {
        console.log(error);
      }
    })();
  }, []);

  /**
   * Handles image capture/selection errors
   */
  const handleImageError = (error) => {
    console.log(error);
    setButtonState("error");
    setTimeout(() => setButtonState("idle"), 2000);
  };

  /**
   * Common image handling setup
   */
  const setupImageCapture = () => {
    setImage(null);
    setResponseData(null);
    setButtonState("loading");
  };

  /**
   * Launch camera to take photo
   */
  const takePhoto = async () => {
    setupImageCapture();
    try {
      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: ['images'],
        allowsEditing: false,
        quality: 1,
        aspect: [4, 3],
      });
      
      if (!result.canceled) {
        const compressedImage = await ImageManipulator.manipulateAsync(
          result.assets[0].uri,
          [],
          { compress: 0.6, format: ImageManipulator.SaveFormat.JPEG }
        );
        setImage(compressedImage.uri);
      }
      setButtonState("idle");
    } catch (error) {
      handleImageError(error);
    }
  };

  /**
   * Launch image picker
   */
  const pickImage = async () => {
    setupImageCapture();
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: false,
        quality: 1,
        aspect: [4, 3],
      });
      
      if (!result.canceled) {
        const compressedImage = await ImageManipulator.manipulateAsync(
          result.assets[0].uri,
          [],
          { compress: 0.6, format: ImageManipulator.SaveFormat.JPEG }
        );
        setImage(compressedImage.uri);
      }
      setButtonState("idle");
    } catch (error) {
      handleImageError(error);
    }
  };

  /**
   * Process image and navigate to results
   */
  const handleContinue = async () => {
    if (!image) return;

    // Client-side scan limit check — redirect to paywall if exceeded
    if (userProfile && !userProfile.isPremium) {
      const currentMonth = `${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, '0')}`;
      const count = userProfile.scanResetDate === currentMonth ? (userProfile.scanCount || 0) : 0;
      if (count >= 3) {
        router.push('/paywall');
        return;
      }
    }

    setButtonState("processing");

    try {
      // Convert compressed image to base64
      const base64Image = await FileSystem.readAsStringAsync(image, {
        encoding: FileSystem.EncodingType.Base64,
      });

      // Call Firebase Cloud Function
      const processBill = httpsCallable(functions, 'process_bill');
      const result = await processBill({ image: base64Image });
      const data = result.data;

      // Validate response data
      if (!data.bill?.items || !data.bill?.subtotal || isNaN(data.bill.subtotal) || data.bill.subtotal === 0) {
        throw new Error('Invalid bill data received');
      }

      setResponseData(data);
      router.push({
        pathname: '/results',
        params: { bill: JSON.stringify(data.bill) }
      });

      setButtonState("idle");
    } catch (error) {
      console.error('Error:', error);

      let message;

      if (error.code === 'functions/resource-exhausted') {
        // Scan limit hit server-side
        router.push('/paywall');
        setButtonState("idle");
        return;
      } else if (
        error.message?.includes('network') ||
        error.message?.includes('Network') ||
        error.message?.includes('fetch') ||
        error.code === 'unavailable' ||
        error.code === 'functions/unavailable'
      ) {
        Alert.alert(
          "No Internet Connection",
          "Scanning a receipt requires internet access. Please check your Wi-Fi or cellular connection and try again.\n\nYou can still use \"Enter Manually\" to split a bill offline.",
          [{ text: "OK" }]
        );
      } else {
        message = "We couldn't read your receipt correctly.";
        setErrorMessage(message);
        setErrorVisible(true);
      }

      setButtonState("error");
      setTimeout(() => setButtonState("idle"), 2000);
    }
  };

  /**
   * Navigate to results page with empty bill template for manual input
   */
  const handleManualInput = () => {
    const emptyBill = {
      items: [],
      subtotal: 0,
      tax: 0,
      tip: 0,
      total: 0,
      isManualInput: true
    };
    
    router.push({
      pathname: '/results',
      params: { bill: JSON.stringify(emptyBill) }
    });
  };

  /**
   * Toggle help modal visibility
   */
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
          
          <View style={styles.backgroundElements}>
            <Animated.View style={[styles.circle1, circle1Transform]} />
            <Animated.View style={[styles.circle2, circle2Transform]} />
            <Animated.View style={[styles.circle3, circle3Transform]} />
            <View style={styles.glowEffect1} />
            <View style={[styles.glowEffect2, { opacity: 0.7 }]} />
          </View>
          
          <View style={styles.header}>
            <View style={styles.titleContainer}>
              <Text style={styles.title}>FLICK</Text>
              <View style={styles.shimmerContainer}>
                <Text style={styles.yellowText}>2</Text>
                <Animated.View style={[
                  styles.shimmerEffect,
                  { transform: [{ translateX: shimmerTranslate }] }
                ]} />
              </View>
              <Text style={styles.title}>SPLIT</Text>
            </View>
            <Text style={styles.tagline}>The best way to split with friends</Text>
          </View>

          <TouchableOpacity
            style={styles.settingsButton}
            onPress={() => router.push('/settings')}
            activeOpacity={0.7}
          >
            <Ionicons name="settings-outline" size={24} color="#FFFFFF" />
          </TouchableOpacity>

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
                <Text style={styles.modalTitle}>How to Use Flick2Split</Text>
                
                <View style={styles.helpSection}>
                  <Text style={styles.helpSectionTitle}>1. Take a Photo</Text>
                  <Text style={styles.helpText}>Take a photo of your bill or upload one from your gallery.</Text>
                </View>

                <View style={styles.helpSection}>
                  <Text style={styles.helpSectionTitle}>2. Review Items</Text>
                  <Text style={styles.helpText}>Our app will automatically extract items and prices for you to review.</Text>
                </View>

                <View style={styles.helpSection}>
                  <Text style={styles.helpSectionTitle}>3. Split the Bill</Text>
                  <Text style={styles.helpText}>Assign items to friends and split the bill fairly based on what each person ordered.</Text>
                </View>

                <View style={styles.helpSection}>
                  <Text style={styles.helpSectionTitle}>4. No Internet?</Text>
                  <Text style={styles.helpText}>If you don't have service/wifi, use the "Enter Manually" option to input bill details yourself.</Text>
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

          {/* Custom Error Modal */}
          <Modal
            animationType="fade"
            transparent={true}
            visible={errorVisible}
            onRequestClose={() => setErrorVisible(false)}
          >
            <View style={styles.modalOverlay}>
              <View style={styles.errorModalContent}>
                <View style={styles.errorIconContainer}>
                  <Ionicons name="warning-outline" size={40} color="#FF3B30" />
                </View>
                
                <Text style={styles.errorModalTitle}>Receipt Not Recognized</Text>
                
                <View style={styles.errorTipsContainer}>
                  <View style={styles.tipRow}>
                    <Ionicons name="phone-portrait-outline" size={22} color="#3442C6" style={styles.tipIcon} />
                    <Text style={styles.tipText}>Hold your phone steady</Text>
                  </View>
                  
                  <View style={styles.tipRow}>
                    <Ionicons name="scan-outline" size={22} color="#3442C6" style={styles.tipIcon} />
                    <Text style={styles.tipText}>Receipt should fill most of the screen</Text>
                  </View>
                  
                  <View style={styles.tipRow}>
                    <Ionicons name="phone-landscape-outline" size={22} color="#3442C6" style={styles.tipIcon} />
                    <Text style={styles.tipText}>Keep phone parallel to the table</Text>
                  </View>
                  
                  <View style={styles.tipRow}>
                    <Ionicons name="sunny-outline" size={22} color="#3442C6" style={styles.tipIcon} />
                    <Text style={styles.tipText}>Ensure good lighting</Text>
                  </View>
                  
                  <View style={styles.tipRow}>
                    <Ionicons name="create-outline" size={22} color="#3442C6" style={styles.tipIcon} />
                    <Text style={styles.tipText}>Try manual entry if problems persist</Text>
                  </View>
                </View>

                <TouchableOpacity 
                  style={styles.errorCloseButton}
                  onPress={() => {
                    setErrorVisible(false);
                    setImage(null); // Clear the image to go back to home screen
                    setButtonState("idle");
                  }}
                >
                  <Text style={styles.errorCloseButtonText}>Try Again</Text>
                </TouchableOpacity>
              </View>
            </View>
          </Modal>

          <View style={styles.content}>
            {image && (
              <View style={styles.imagePreview}>
                <Image source={{ uri: image }} style={styles.previewImage} />
                
                {/* Title at the top */}
                <View style={styles.previewTitleContainer}>
                  <Text style={styles.previewText}>Receipt Preview</Text>
                </View>
                
                {/* Retake button at the bottom */}
                <View style={styles.imageOverlay}>
                  <TouchableOpacity 
                    style={styles.retakeButton}
                    onPress={() => setImage(null)}
                  >
                    <Ionicons name="refresh-outline" size={12} color="white" />
                    <Text style={styles.retakeButtonText}>Retake</Text>
                  </TouchableOpacity>
                </View>
              </View>
            )}
            
            {!image ? (
              <>
                <Animated.View style={{ transform: [{ scale: buttonPulse }], width: '100%', alignItems: 'center' }}>
                  <View style={styles.buttonGlow}></View>
                  <TouchableOpacity
                    style={[
                      styles.button,
                      buttonState === "loading" && styles.buttonLoading,
                      buttonState === "error" && styles.buttonError,
                    ]}
                    onPress={takePhoto}
                    disabled={buttonState === "loading"}
                    activeOpacity={0.7}
                  >
                    <LinearGradient
                      colors={['#ffffff', '#ffffff', '#f8f8f8']}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 1 }}
                      style={styles.buttonGradient}
                    />
                    <View style={styles.buttonInner}>
                      <Text style={styles.buttonText}>
                        {buttonState === "loading" ? "Processing..." : 
                         buttonState === "error" ? "Error" : "Take Photo"}
                      </Text>
                      {buttonState !== "loading" && buttonState !== "error" && (
                        <Ionicons name="camera" size={28} color="#3442C6" style={styles.buttonIcon} />
                      )}
                    </View>
                  </TouchableOpacity>
                </Animated.View>
                
                <TouchableOpacity
                  style={[
                    styles.secondaryButton,
                    buttonState === "loading" && styles.buttonLoading,
                    buttonState === "error" && styles.buttonError,
                  ]}
                  onPress={pickImage}
                  disabled={buttonState === "loading"}
                  activeOpacity={0.8}
                >
                  <Text style={styles.secondaryButtonText}>
                    Choose from Gallery
                  </Text>
                </TouchableOpacity>
                
                <Text style={styles.instructions}>Snap a photo of your bill or upload one</Text>

                {userProfile && !userProfile.isPremium && (
                  <View style={styles.scanCounter}>
                    <Ionicons name="scan-outline" size={14} color="rgba(255,255,255,0.85)" />
                    <Text style={styles.scanCounterText}>
                      {(() => {
                        const currentMonth = `${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, '0')}`;
                        const count = userProfile.scanResetDate === currentMonth ? (userProfile.scanCount || 0) : 0;
                        return `${count}/3 free scans this month`;
                      })()}
                    </Text>
                  </View>
                )}
                
                <TouchableOpacity
                  style={styles.manualInputButton}
                  onPress={handleManualInput}
                  activeOpacity={0.7}
                >
                  <Text style={styles.manualInputText}>Having trouble? Enter Manually</Text>
                </TouchableOpacity>
              </>
            ) : (
              <TouchableOpacity
                style={[
                  styles.continueButton,
                  buttonState === "processing" && styles.buttonProcessing,
                  buttonState === "error" && styles.buttonError,
                ]}
                onPress={handleContinue}
                disabled={buttonState === "processing"}
                activeOpacity={0.8}
              >
                <LinearGradient
                  colors={['#4CDE80', '#3ED573', '#38C56B']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={styles.continueButtonGradient}
                />
                {buttonState === "processing" ? (
                  <View style={styles.processingContainer}>
                    <ActivityIndicator color="#ffffff" size="small" />
                    <Text style={styles.continueButtonText}> Processing...</Text>
                  </View>
                ) : (
                  <Text style={styles.continueButtonText}>Continue</Text>
                )}
              </TouchableOpacity>
            )}
          </View>
        </View>
      </SafeAreaView>
    </>
  );
}

const styles = StyleSheet.create({
  backgroundGradient: {
    flex: 1,
  },
  safeArea: {
    flex: 1,
  },
  container: {
    flex: 1,
    justifyContent: "space-between",
    paddingVertical: 60,
    paddingHorizontal: 20,
    position: 'relative',
    overflow: 'hidden',
  },
  backgroundElements: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: -1,
  },
  circle1: {
    position: 'absolute',
    width: width * 1.2,
    height: width * 1.2,
    borderRadius: width * 0.6,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    top: -width * 0.8,
    left: -width * 0.3,
  },
  circle2: {
    position: 'absolute',
    width: width,
    height: width,
    borderRadius: width * 0.5,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    bottom: -width * 0.5,
    right: -width * 0.3,
  },
  circle3: {
    position: 'absolute',
    width: width * 0.8,
    height: width * 0.8,
    borderRadius: width * 0.4,
    backgroundColor: 'rgba(80, 130, 255, 0.15)',
    top: width * 0.4,
    left: -width * 0.4,
  },
  glowEffect1: {
    position: 'absolute',
    width: width * 0.7,
    height: width * 0.7,
    borderRadius: width * 0.35,
    backgroundColor: 'rgba(255, 223, 0, 0.08)',
    top: width * 0.2,
    right: -width * 0.35,
    shadowColor: "#FFDF00",
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.5,
    shadowRadius: 40,
  },
  glowEffect2: {
    position: 'absolute',
    width: width * 0.5,
    height: width * 0.5,
    borderRadius: width * 0.25,
    backgroundColor: 'rgba(76, 222, 128, 0.1)',
    bottom: width * 0.2,
    left: width * 0.25,
    shadowColor: "#4CDE80",
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.3,
    shadowRadius: 30,
  },
  header: {
    alignItems: "center",
    marginTop: 0,
  },
  titleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  title: {
    fontSize: 50,
    fontWeight: "900",
    color: "white",
    textShadowColor: 'rgba(0, 0, 0, 0.69)',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 10,
    letterSpacing: 1.5,
    
  },
  yellowText: {
    fontSize: 60,
    fontWeight: "900",
    color: "#FFDF00", // Bright yellow color
    textShadowColor: 'rgba(0, 0, 0, 0.74)',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 10,
    letterSpacing: 1.5,
  },
  tagline: {
    fontSize: 18,
    color: "white",
    opacity: 0.9,
    textAlign: 'center',
    fontWeight: '500',
    textShadowColor: 'rgba(0, 0, 0, 0.74)',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 5,
  },
  content: {
    flex: 1,
    justifyContent: "flex-start",
    alignItems: "center",
    width: '100%',
    paddingTop: 25,
    
  },
  button: {
    backgroundColor: "white",
    paddingVertical: 35,
    paddingHorizontal: 30,
    borderRadius: 30,
    elevation: 6,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.25,
    shadowRadius: 10,
    marginBottom: 25,
    marginTop: 100,
    width: '90%',
    alignItems: 'center',
    justifyContent: 'center',
    transform: [{ scale: 1 }],
    borderWidth: 0.5,
    borderColor: 'rgba(255, 255, 255, 0.3)',
    overflow: 'hidden',
  },
  secondaryButton: {
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    paddingVertical: 20,
    paddingHorizontal: 30,
    borderRadius: 30,
    borderWidth: 2,
    borderColor: 'rgba(255, 255, 255, 0.8)',
    marginBottom: 30,
    shadowColor: "#000",
    shadowOffset: { width: 10, height: 6 },
    shadowOpacity: 0.5,
    shadowRadius: 8,
    width: '90%',
    alignItems: 'center',
    backdropFilter: 'blur(10px)',
  },
  continueButton: {
    paddingVertical: 18,
    paddingHorizontal: 45,
    borderRadius: 30,
    elevation: 8,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    marginTop: 8,
    width: '85%',
    alignItems: 'center',
    transform: [{ scale: 1.02 }],
    borderWidth: 1.5,
    borderColor: 'rgba(76, 222, 128, 0.5)',
    overflow: 'hidden',
  },
  buttonLoading: {
    backgroundColor: "rgba(255, 255, 255, 0.7)",
  },
  buttonProcessing: {
    opacity: 0.8,
  },
  buttonError: {
    backgroundColor: "rgba(255, 100, 100, 0.9)",
  },
  buttonInner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
    paddingHorizontal: 5,
  },
  buttonText: {
    fontSize: 22,
    fontWeight: "800",
    color: "#3442C6",
    textAlign: 'center',
    letterSpacing: 0.3,
  },
  secondaryButtonText: {
    fontSize: 18,
    fontWeight: "700",
    color: "white",
    textShadowColor: 'rgba(0, 0, 0, 0.2)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },
  continueButtonText: {
    fontSize: 20,
    fontWeight: "800",
    color: "white",
    letterSpacing: 0.5,
  },
  processingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  instructions: {
    color: "white",
    marginTop: 0,
    marginBottom: 35,
    fontSize: 16,
    fontWeight: '500',
    opacity: 0.9,
    textAlign: 'center',
  },
  imagePreview: {
    width: '98%',
    aspectRatio: 2/3,
    minHeight: 280,
    maxHeight: 400,
    borderRadius: 18,
    marginBottom: 20,
    marginTop: 2,
    overflow: 'hidden',
    borderWidth: 0,
    ...Platform.select({
      ios: {
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.3,
        shadowRadius: 15,
      },
      android: {
        elevation: 12,
      }
    }),
    position: 'relative',
    padding: 0,
    backgroundColor: 'transparent',
  },
  previewImage: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  imageOverlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingVertical: 8,
    paddingHorizontal: 14,
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
    borderBottomLeftRadius: 18,
    borderBottomRightRadius: 18,
  },
  retakeButton: {
    paddingVertical: 4,
    paddingHorizontal: 10,
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.25)',
    flexDirection: 'row',
    alignItems: 'center',
  },
  retakeButtonText: {
    color: 'white',
    fontWeight: '500',
    fontSize: 12,
    marginLeft: 3,
  },
  previewText: {
    color: 'white',
    fontWeight: '600',
    fontSize: 15,
  },
  scanCounter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.12)',
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 20,
    marginBottom: 15,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  scanCounterText: {
    color: 'rgba(255, 255, 255, 0.85)',
    fontSize: 13,
    fontWeight: '600',
    marginLeft: 6,
  },
  manualInputButton: {
    paddingVertical: 12,
    paddingHorizontal: 10,
    borderRadius: 25,
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    borderWidth: 1.5,
    borderColor: 'rgba(255, 255, 255, 0.6)',
    marginTop: 10,
    marginBottom: 10,
    width: '65%',
    alignItems: 'center',
    alignSelf: 'center',
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 3,
    elevation: 2,
  },
  manualInputText: {
    color: 'white',
    fontWeight: '600',
    fontSize: 13,
  },
  settingsButton: {
    position: 'absolute',
    top: 20,
    left: 15,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 10,
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
  buttonIcon: {
    marginLeft: 12,
  },
  previewTitleContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    padding: 10,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    borderTopLeftRadius: 18,
    borderTopRightRadius: 18,
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
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.5)',
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
  // Error modal styles
  errorModalContent: {
    backgroundColor: 'white',
    padding: 25,
    borderRadius: 20,
    width: '90%',
    maxWidth: 400,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.3,
    shadowRadius: 20,
    elevation: 10,
  },
  errorIconContainer: {
    width: 70,
    height: 70,
    borderRadius: 35,
    backgroundColor: 'rgba(255, 59, 48, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 15,
  },
  errorModalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 20,
    textAlign: 'center',
  },
  errorTipsContainer: {
    width: '100%',
    marginBottom: 20,
  },
  tipRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    paddingHorizontal: 10,
  },
  tipIcon: {
    marginRight: 12,
  },
  tipText: {
    fontSize: 16,
    color: '#555',
    flex: 1,
  },
  errorCloseButton: {
    backgroundColor: '#3442C6',
    paddingVertical: 12,
    paddingHorizontal: 30,
    borderRadius: 25,
    marginBottom: 0,
    width: '80%',
    alignItems: 'center',
  },
  errorCloseButtonText: {
    color: 'white',
    fontWeight: 'bold',
    fontSize: 16,
  },
});