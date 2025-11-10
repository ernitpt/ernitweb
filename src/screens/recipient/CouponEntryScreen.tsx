import React, { useRef, useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, SafeAreaView, KeyboardAvoidingView, Platform, ScrollView, ActivityIndicator, Animated, Easing, StyleSheet } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { LinearGradient } from 'expo-linear-gradient';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RecipientStackParamList, ExperienceGift } from '../../types'; // Ensure this path is correct
import { useApp } from '../../context/AppContext'; // Ensure this path is correct
import MainScreen from '../MainScreen';
import { db } from '../../services/firebase';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { Italic } from 'lucide-react-native';

type CouponEntryNavigationProp = NativeStackNavigationProp<RecipientStackParamList, 'CouponEntry'>;

const CouponEntryScreen = () => {
  const navigation = useNavigation<CouponEntryNavigationProp>();
  const { dispatch } = useApp();
  const [claimCode, setClaimCode] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [showMessagePopup, setShowMessagePopup] = useState(false);
  const [popupMessage, setPopupMessage] = useState<string | null>(null);
  const [popupGiverName, setPopupGiverName] = useState<string | null>(null);
  const [currentGift, setCurrentGift] = useState<ExperienceGift | null>(null);

  const popupAnim = useRef(new Animated.Value(0)).current;
  const popupScale = useRef(new Animated.Value(0.9)).current;

  const validateClaimCode = (code: string) => {
    const codeRegex = /^[A-Z0-9]{6}$/;
    return codeRegex.test(code);
  };
  const closeMessagePopup = () => {
    Animated.parallel([
      Animated.timing(popupAnim, { toValue: 0, duration: 150, useNativeDriver: true }),
      Animated.timing(popupScale, { toValue: 0.9, duration: 150, useNativeDriver: true }),
    ]).start(() => setShowMessagePopup(false));
  };

  const proceedToGoal = () => {
    closeMessagePopup();

    setTimeout(() => {
      if (currentGift) {
        navigation.reset({
          index: 0,
          routes: [{ name: "GoalSetting", params: { experienceGift: currentGift } }],
        });
      }
    }, 200);
  };


  const handleClaimCode = async () => {
  const trimmedCode = claimCode.trim().toUpperCase();
  setErrorMessage('');

  if (!trimmedCode) {
    setErrorMessage('Please enter a claim code');
    return;
  }

  if (!validateClaimCode(trimmedCode)) {
    setErrorMessage('Please enter a valid 6-character code (letters and numbers only)');
    return;
  }

  setIsLoading(true);
  dispatch({ type: 'SET_LOADING', payload: true });

  try {
    // Query Firestore for experienceGift with this claimCode and pending status
    const giftsRef = collection(db, 'experienceGifts');
    const q = query(giftsRef, where('claimCode', '==', trimmedCode), where('status', '==', 'pending'));
    const querySnapshot = await getDocs(q);

    if (querySnapshot.empty) {
      setErrorMessage('This claim code is invalid or already claimed');
      return;
    }

    // Take the first matching gift (should only be one)
    const giftDoc = querySnapshot.docs[0];
    const experienceGift = { id: giftDoc.id, ...(giftDoc.data() as ExperienceGift) };
    setCurrentGift(experienceGift);

    // ✅ If message exists, show popup instead of navigating immediately
    if (experienceGift.personalizedMessage) {
      setPopupMessage(experienceGift.personalizedMessage);
      setPopupGiverName(experienceGift.giverName || "your friend");
      setShowMessagePopup(true);

      // Animate popup in
      Animated.parallel([
        Animated.timing(popupAnim, { toValue: 1, duration: 200, useNativeDriver: true }),
        Animated.spring(popupScale, { toValue: 1, friction: 5, useNativeDriver: true }),
      ]).start();

      // Store gift for later navigation
      dispatch({ type: "SET_EXPERIENCE_GIFT", payload: experienceGift });
      setIsLoading(false);
      dispatch({ type: "SET_LOADING", payload: false });
      return; // ✅ Stop here until user presses "Continue"
    }

    // If no message, go directly
    dispatch({ type: "SET_EXPERIENCE_GIFT", payload: experienceGift });
    navigation.reset({
      index: 0,
      routes: [{ name: "GoalSetting", params: { experienceGift } }],
    });

  } catch (error) {
    console.error('Error claiming experience gift:', error);
    setErrorMessage('An error occurred. Please try again.');
  } finally {
    setIsLoading(false);
    dispatch({ type: 'SET_LOADING', payload: false });
  }
};


  return (
    <MainScreen activeRoute="Goals">
      <LinearGradient
        colors={['#7C3AED', '#3B82F6']}
        style={{ flex: 1 }}
      >
        <SafeAreaView style={{ flex: 1 }}>
        <StatusBar style="light" />
        <KeyboardAvoidingView 
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={{ flex: 1 }}
        >
          <ScrollView 
            contentContainerStyle={{ 
              paddingTop: 45,
              flexGrow: 1,
              justifyContent: 'center', 
            }}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            <View style={{ 
              flex: 1, 
              alignItems: 'center', 
              justifyContent: 'center', // ✅ Added to ensure vertical centering
              paddingHorizontal: 32,
            }}>
              {/* Header - Centered */}
              <View style={{ 
                // ✅ Reduced marginBottom to 48 to control space to the input box
                marginBottom: 36, 
                alignItems: 'center' 
              }}>
                {/* ✅ Split title into two for separate styling and positioning */}
                <Text style={{ 
                  fontSize: 40, // Slightly smaller font size
                  fontWeight: 'bold', 
                  color: 'white', 
                  textAlign: 'center',
                  marginBottom: 20, 
                }}>
                  Claim your
                </Text>
                <Text style={{ 
                  fontSize: 40, // Larger font size for emphasis
                  fontWeight: 'bold', 
                  color: 'white', 
                  textAlign: 'center',
                  // ✅ Tightened space between title lines
                  marginTop: -28, 
                  // ✅ Controls space below the entire title block
                  marginBottom: 12, 
                }}>
                  Ernit
                </Text>
                <Text style={{ 
                  fontSize: 18, 
                  color: '#E9D5FF', 
                  textAlign: 'center',
                  maxWidth: 300
                }}>
                  Enter the code you got below and start earning your reward
                </Text>
              </View>

              {/* Code Input & Button Container */}
              <View style={{ 
                width: '100%', 
                maxWidth: 400, 
                alignItems: 'center'
              }}>
                <TextInput
                  style={{
                    backgroundColor: 'white',
                    borderRadius: 16,
                    paddingHorizontal: 20,
                    paddingVertical: 16,
                    fontSize: 18,
                    textAlign: 'center',
                    letterSpacing: 4,
                    shadowColor: '#000',
                    shadowOffset: { width: 0, height: 2 },
                    shadowOpacity: 0.1,
                    shadowRadius: 8,
                    elevation: 3,
                    borderWidth: errorMessage ? 2 : 0,
                    borderColor: errorMessage ? '#EF4444' : 'transparent',
                    width: '100%',
                  }}
                  placeholder="ABC123"
                  placeholderTextColor="#9CA3AF"
                  value={claimCode}
                  onChangeText={(text) => {
                    setClaimCode(text.toUpperCase());
                    if (errorMessage) setErrorMessage('');
                  }}
                  maxLength={6}
                  autoCapitalize="characters"
                  autoCorrect={false}
                  autoFocus
                  editable={!isLoading}
                />
                
                {/* Error Message Displayed Below Input */}
                {errorMessage ? (
                  <Text style={{ 
                    color: 'white', 
                    fontSize: 14, 
                    marginTop: 8, 
                    textAlign: 'center',
                    fontWeight: '500',
                    // ✅ Ensures error message takes up consistent space
                    height: 20, 
                  }}>
                    {errorMessage}
                  </Text>
                ) : (
                  // ✅ Adds a placeholder view to prevent layout shift when error appears
                  <View style={{ height: 20, marginTop: 8 }} />
                )}

                <TouchableOpacity
                  onPress={handleClaimCode}
                  disabled={isLoading || claimCode.length < 6}
                  activeOpacity={0.8}
                  style={{
                    width: '100%', 
                    backgroundColor: (isLoading || claimCode.length < 6) ? '#D1D5DB' : 'white',
                    paddingVertical: 18,
                    borderRadius: 16,
                    alignItems: 'center',
                    justifyContent: 'center',
                    shadowColor: '#000',
                    shadowOffset: { width: 0, height: 4 },
                    shadowOpacity: 0.2,
                    shadowRadius: 6,
                    elevation: 5,
                    // ✅ Consistent top margin, independent of error message
                    marginTop: -10, 
                  }}
                >
                  {isLoading ? (
                    <ActivityIndicator color="#7C3AED" />
                  ) : (
                    <Text style={{ 
                      color: '#7C3AED', 
                      fontSize: 18, 
                      fontWeight: 'bold' 
                    }}>
                      Claim Reward
                    </Text>
                  )}
                </TouchableOpacity>
              </View>
              
              {/* Info Box */}
              <View style={{
                backgroundColor: 'rgba(255, 255, 255, 0.2)',
                borderRadius: 20,
                padding: 24,
                width: '100%',
                maxWidth: 400,
                marginTop: 36, // ✅ Increased space from the claim button
              }}>
                <Text style={{ 
                  color: 'white', 
                  fontSize: 18, 
                  fontWeight: 'bold', 
                  marginBottom: 16,
                  textAlign: 'center'
                }}>
                  How it works:
                </Text>
                <View style={{ gap: 8 }}>
                  <Text style={{ color: '#E9D5FF', fontSize: 16, textAlign: 'center' }}>1. Enter your claim code</Text>
                  <Text style={{ color: '#E9D5FF', fontSize: 16, textAlign: 'center' }}>2. Set personal goals to earn the reward</Text>
                  <Text style={{ color: '#E9D5FF', fontSize: 16, textAlign: 'center' }}>3. Receive AI-generated hints as you progress</Text>
                  <Text style={{ color: '#E9D5FF', fontSize: 16, textAlign: 'center' }}>4. Achieve your goals and claim your reward!</Text>
                </View>
              </View>
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
      </LinearGradient>
      {showMessagePopup && (
  <Animated.View
    style={[
      styles.modalOverlay,
      { opacity: popupAnim, transform: [{ scale: popupScale }] },
    ]}
  >
    <LinearGradient
      colors={["#faf5ff", "#f5f3ff"]}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={styles.modalBox}
    >
      <Text style={styles.modalHeader}>A message from</Text>
      <Text style={styles.modalGiverName}>
        {popupGiverName || "Someone who believes in you 💙"}
      </Text>

      <View style={styles.messageBubble}>
        <Text style={styles.modalMessageText}>"{popupMessage}"</Text>
      </View>

      <TouchableOpacity
        onPress={proceedToGoal}
        style={styles.continueButton}
        activeOpacity={0.8}
      >
        <LinearGradient
          colors={["#7C3AED", "#3B82F6"]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.continueGradient}
        >
          <Text style={styles.continueText}>Continue</Text>
        </LinearGradient>
      </TouchableOpacity>
    </LinearGradient>
  </Animated.View>
)}


    </MainScreen>
  );
};

const styles = StyleSheet.create({
 modalOverlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "rgba(0,0,0,0.45)",
    justifyContent: "center",
    alignItems: "center",
    padding: 24,
    zIndex: 999,
  },
  modalBox: {
    width: "90%",
    maxWidth: 380,
    borderRadius: 24,
    paddingVertical: 32,
    paddingHorizontal: 24,
    backgroundColor: "#fff",
    shadowColor: "#000",
    shadowOpacity: 0.15,
    shadowRadius: 16,
    elevation: 8,
    alignItems: "center",
  },
  modalHeader: {
    fontSize: 16,
    fontWeight: "500",
    color: "#6B7280",
    textAlign: "center",
  },
  modalGiverName: {
    fontSize: 22,
    fontWeight: "800",
    color: "#5B21B6",
    marginBottom: 10,
    marginTop: 4,
    textAlign: "center",
  },
  messageBubble: {
    backgroundColor: "#ffffff",
    borderRadius: 10,
    paddingVertical: 18,
    paddingHorizontal: 22,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: "#E9D5FF",
    shadowColor: "#7C3AED",
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
    margin: 4,
  },
  modalMessageText: {
    fontSize: 17,
    color: "#303b4bff",
    textAlign: "center",
    lineHeight: 26,
    fontWeight: "400",
    fontStyle: "italic",
  },
  continueButton: {
    width: "100%",
  },
  continueGradient: {
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: "center",
  },
  continueText: {
    color: "#fff",
    fontSize: 18,
    fontWeight: "700",
    letterSpacing: 0.3,
  },
});

export default CouponEntryScreen;