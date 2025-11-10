import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  TextInput,
  Alert,
  StyleSheet,
  ActivityIndicator,
  ScrollView,
  Platform,
  KeyboardAvoidingView,
} from "react-native";
import { useNavigation, useRoute } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { Elements, PaymentElement, useStripe, useElements } from "@stripe/react-stripe-js";
import { loadStripe } from "@stripe/stripe-js";
import { ChevronLeft, Lock, CreditCard } from "lucide-react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";

import { GiverStackParamList, Experience, ExperienceGift } from "../../types";
import { stripeService } from "../../services/stripeService";
import { useApp } from "../../context/AppContext";
import MainScreen from "../MainScreen";

const stripePromise = loadStripe(process.env.EXPO_PUBLIC_STRIPE_PK!);

type NavigationProp = NativeStackNavigationProp<GiverStackParamList, "ExperienceCheckout">;

// API helper to check if gift was created
const checkGiftCreation = async (paymentIntentId: string): Promise<ExperienceGift | null> => {
  try {
    const response = await fetch(
      `https://europe-west1-ernit-3fc0b.cloudfunctions.net/getGiftByPaymentIntent?paymentIntentId=${paymentIntentId}`
    );
    
    if (response.ok) {
      const gift = await response.json();
      return {
        ...gift,
        createdAt: new Date(gift.createdAt),
        deliveryDate: new Date(gift.deliveryDate),
        updatedAt: new Date(gift.updatedAt),
      };
    }
    return null;
  } catch (error) {
    console.error("Error checking gift creation:", error);
    return null;
  }
};

// Poll for gift creation (webhook processing may take a moment)
const pollForGift = async (
  paymentIntentId: string,
  maxAttempts: number = 10,
  delayMs: number = 1000
): Promise<ExperienceGift | null> => {
  for (let i = 0; i < maxAttempts; i++) {
    const gift = await checkGiftCreation(paymentIntentId);
    if (gift) {
      return gift;
    }
    await new Promise((resolve) => setTimeout(resolve, delayMs));
  }
  return null;
};

function CheckoutInner({ clientSecret, paymentIntentId }: { clientSecret: string; paymentIntentId: string }) {
  const route = useRoute();
  const { experience } = route.params as { experience: Experience };
  const navigation = useNavigation<NavigationProp>();
  const { state, dispatch } = useApp();

  const stripe = useStripe();
  const elements = useElements();

  const [message, setMessage] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);
  const [charCount, setCharCount] = useState(0);
  const [isCheckingRedirect, setIsCheckingRedirect] = useState(false);

  // --- Storage helpers (web + native)
  const getStorageItem = async (key: string) => {
    if (Platform.OS === "web" && typeof window !== "undefined") return localStorage.getItem(key);
    return await AsyncStorage.getItem(key);
  };

  const setStorageItem = async (key: string, value: string) => {
    if (Platform.OS === "web" && typeof window !== "undefined") localStorage.setItem(key, value);
    else await AsyncStorage.setItem(key, value);
  };

  const removeStorageItem = async (key: string) => {
    if (Platform.OS === "web" && typeof window !== "undefined") localStorage.removeItem(key);
    else await AsyncStorage.removeItem(key);
  };

  // --- Handle redirect-based payments (e.g. MB Way)
  useEffect(() => {
    const checkRedirectReturn = async () => {
      if (!stripe) return;

      let redirectClientSecret: string | null = null;
      let shouldCheck = false;

      if (Platform.OS === "web" && typeof window !== "undefined") {
        const params = new URLSearchParams(window.location.search);
        redirectClientSecret = params.get("payment_intent_client_secret");
        if (redirectClientSecret) shouldCheck = true;
      } else {
        const pendingPayment = await getStorageItem(`pending_payment_${clientSecret}`);
        if (pendingPayment === "true") {
          redirectClientSecret = clientSecret;
          shouldCheck = true;
        }
      }

      if (!shouldCheck || !redirectClientSecret || redirectClientSecret !== clientSecret) return;

      setIsCheckingRedirect(true);
      try {
        const { paymentIntent, error } = await stripe.retrievePaymentIntent(redirectClientSecret);
        if (error) {
          console.error("Error retrieving payment intent:", error);
          Alert.alert("Payment Verification Failed", "Could not verify payment. Please contact support if payment was deducted.");
          setIsCheckingRedirect(false);
          return;
        }

        if (paymentIntent?.status === "succeeded") {
          console.log("💰 Payment succeeded, checking for gift creation...");
          
          // Poll for gift creation (webhook may take a moment)
          const gift = await pollForGift(paymentIntent.id);
          
          if (gift) {
            console.log("✅ Gift found:", gift.id);
            dispatch({ type: "SET_EXPERIENCE_GIFT", payload: gift });
            
            // Cleanup
            await removeStorageItem(`pending_payment_${clientSecret}`);
            
            // Clean URL
            if (Platform.OS === "web" && typeof window !== "undefined") {
              window.history.replaceState({}, document.title, window.location.pathname);
            }
            
            Alert.alert("Success", "Your payment was processed successfully!");
            navigation.navigate("Confirmation", { experienceGift: gift });
          } else {
            console.warn("⚠️ Gift not found after polling");
            Alert.alert(
              "Payment Processed",
              "Your payment was successful. Your gift is being prepared and will be available shortly. Please check your email or contact support."
            );
          }
        } else if (paymentIntent?.status === "processing") {
          Alert.alert(
            "Payment Processing",
            "Your payment is being processed. You will receive a confirmation shortly."
          );
        } else if (paymentIntent?.status === "requires_action") {
          Alert.alert(
            "Action Required",
            "Additional action is required to complete your payment."
          );
        }
      } catch (err: any) {
        console.error("Error handling redirect return:", err);
        Alert.alert("Error", "Failed to verify payment status. Please contact support.");
      } finally {
        setIsCheckingRedirect(false);
      }
    };

    const timer = setTimeout(() => checkRedirectReturn(), 500);
    return () => clearTimeout(timer);
  }, [stripe, clientSecret, navigation, dispatch]);

  const handleMessageChange = (text: string) => {
    if (text.length <= 500) {
      setMessage(text);
      setCharCount(text.length);
    }
  };

  const handlePurchase = async () => {
    if (!stripe || !elements) {
      Alert.alert("Stripe not ready", "Please wait a few seconds and try again.");
      return;
    }

    setIsProcessing(true);

    // Mark as pending payment
    await setStorageItem(`pending_payment_${clientSecret}`, "true");

    try {
      // Update metadata with personalized message before confirming
      // Note: This won't work directly in confirmPayment, so we need to update the PaymentIntent first
      if (message) {
        try {
          // Call your backend to update the payment intent metadata
          await fetch(
            "https://europe-west1-ernit-3fc0b.cloudfunctions.net/updatePaymentIntentMetadata",
            {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                paymentIntentId,
                personalizedMessage: message,
              }),
            }
          );
        } catch (err) {
          console.warn("Could not update message, proceeding anyway");
        }
      }

      const { error, paymentIntent } = await stripe.confirmPayment({
        elements,
        confirmParams: {
          return_url:
            Platform.OS === "web"
              ? window.location.href
              : "https://ernit-nine.vercel.app/payment-success",
        },
        redirect: "if_required",
      });

      if (error) throw error;
      if (!paymentIntent) throw new Error("No payment intent returned.");

      // If payment succeeded instantly (no redirect)
      if (paymentIntent.status === "succeeded") {
        console.log("💰 Payment succeeded immediately, checking for gift...");
        
        // Poll for gift creation
        const gift = await pollForGift(paymentIntent.id);
        
        if (gift) {
          console.log("✅ Gift found:", gift.id);
          dispatch({ type: "SET_EXPERIENCE_GIFT", payload: gift });
          await removeStorageItem(`pending_payment_${clientSecret}`);
          
          Alert.alert("Success", "Your payment was processed successfully!");
          navigation.navigate("Confirmation", { experienceGift: gift });
        } else {
          console.warn("⚠️ Gift not found after polling");
          Alert.alert(
            "Payment Processed",
            "Your payment was successful. Your gift is being prepared and will be available shortly."
          );
        }
      } else if (paymentIntent.status === "processing") {
        Alert.alert(
          "Payment Processing",
          "Your payment is being processed. You will receive confirmation shortly."
        );
      }
      // If redirect happened, useEffect will handle it
    } catch (err: any) {
      await removeStorageItem(`pending_payment_${clientSecret}`);
      const errorMessage = err.message || "Something went wrong.";
      Alert.alert("Payment Failed", errorMessage);
      console.error("Payment error:", err);
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <MainScreen activeRoute="Home">
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={{ flex: 1 }}
      >
        <View style={styles.container}>
          {/* Header */}
          <View style={styles.header}>
            <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
              <ChevronLeft color="#111827" size={24} />
            </TouchableOpacity>
            <Text style={styles.headerTitle}>Checkout</Text>
            <View style={styles.lockIcon}>
              <Lock color="#10b981" size={20} />
            </View>
          </View>

          {(isCheckingRedirect || isProcessing) && (
            <View style={styles.processingOverlay}>
              <ActivityIndicator color="#8b5cf6" size="large" />
              <Text style={styles.processingText}>
                {isCheckingRedirect ? "Verifying payment..." : "Processing payment..."}
              </Text>
            </View>
          )}

          <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
            {/* Summary */}
            <View style={styles.summaryCard}>
              <Text style={styles.summaryLabel}>Your Experience</Text>
              <Text style={styles.summaryTitle}>{experience.title}</Text>
              <Text style={styles.subtitle}>{experience.subtitle}</Text>
              <View style={styles.priceLine}>
                <Text style={styles.priceLabel}>Total Amount</Text>
                <Text style={styles.priceAmount}>€{experience.price.toFixed(2)}</Text>
              </View>
            </View>

            {/* Message */}
            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <Text style={styles.sectionTitle}>Personal Message</Text>
                <Text style={styles.charCounter}>{charCount}/500</Text>
              </View>
              <Text style={styles.sectionSubtitle}>
                Make it special with a heartfelt message
              </Text>
              <TextInput
                style={styles.messageInput}
                placeholder="Share why this experience is perfect for them..."
                placeholderTextColor="#9ca3af"
                multiline
                value={message}
                onChangeText={handleMessageChange}
                textAlignVertical="top"
                maxLength={500}
              />
            </View>

            {/* Payment */}
            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <CreditCard color="#8b5cf6" size={20} />
                <Text style={[styles.sectionTitle, { marginLeft: 8 }]}>Payment Details</Text>
              </View>
              <View style={styles.paymentBox}>
                <PaymentElement />
              </View>
            </View>

            {/* Security note */}
            <View style={styles.securityNotice}>
              <Lock color="#6b7280" size={16} />
              <Text style={styles.securityText}>
                Your payment information is encrypted and secure
              </Text>
            </View>

            <View style={{ height: 120 }} />
          </ScrollView>

          {/* Bottom CTA */}
          <View style={styles.bottomBar}>
            <View style={styles.totalSection}>
              <Text style={styles.totalLabel}>Total</Text>
              <Text style={styles.totalAmount}>€{experience.price.toFixed(2)}</Text>
            </View>
            <TouchableOpacity
              style={[styles.payButton, isProcessing && styles.payButtonDisabled]}
              onPress={handlePurchase}
              disabled={isProcessing}
              activeOpacity={0.8}
            >
              {isProcessing ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.payButtonText}>Complete Purchase</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>
    </MainScreen>
  );
}

export default function ExperienceCheckoutScreen() {
  const route = useRoute();
  const { experience } = route.params as { experience: Experience };
  const { state } = useApp();
  const navigation = useNavigation<NavigationProp>();

  const [clientSecret, setClientSecret] = useState<string | null>(null);
  const [paymentIntentId, setPaymentIntentId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const init = async () => {
      try {
        // Create payment intent with full metadata
        const response = await stripeService.createPaymentIntent(
          experience.price,
          experience.id,
          state.user?.id || "",
          state.user?.displayName || "",
          experience.partnerId,
          "" // Message will be updated later
        );
        
        setClientSecret(response.clientSecret);
        setPaymentIntentId(response.paymentIntentId);
      } catch (err: any) {
        Alert.alert("Error", err.message);
      } finally {
        setLoading(false);
      }
    };
    init();
  }, [experience]);

  if (loading) {
    return (
      <MainScreen activeRoute="Home">
        <View style={styles.loadingContainer}>
          <ActivityIndicator color="#8b5cf6" size="large" />
          <Text style={styles.loadingText}>Setting up checkout...</Text>
        </View>
      </MainScreen>
    );
  }

  if (!clientSecret || !paymentIntentId) {
    return (
      <MainScreen activeRoute="Home">
        <View style={styles.loadingContainer}>
          <Text style={styles.errorText}>Could not initialize payment.</Text>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.retryButton}>
            <Text style={styles.retryButtonText}>Go Back</Text>
          </TouchableOpacity>
        </View>
      </MainScreen>
    );
  }

  return (
    <Elements 
      stripe={stripePromise} 
      options={{ 
        clientSecret,
        appearance: {
          theme: 'stripe',
          variables: {
            colorPrimary: '#8b5cf6',
            colorBackground: '#ffffff',
            colorText: '#111827',
            colorDanger: '#ef4444',
            fontFamily: 'system-ui, -apple-system, sans-serif',
            spacingUnit: '4px',
            borderRadius: '8px',
          },
        },
      }}
    >
      <CheckoutInner clientSecret={clientSecret} paymentIntentId={paymentIntentId} />
    </Elements>
  );
}

// --- Styles (same as before) ---
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#f9fafb" },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingTop: Platform.OS === "ios" ? 50 : 40,
    paddingBottom: 16,
    backgroundColor: "#fff",
    borderBottomWidth: 1,
    borderBottomColor: "#e5e7eb",
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#f3f4f6",
    justifyContent: "center",
    alignItems: "center",
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: "#111827",
    flex: 1,
    textAlign: "center",
  },
  lockIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#f0fdf4",
    justifyContent: "center",
    alignItems: "center",
  },
  scrollView: { flex: 1, paddingHorizontal: 20 },
  summaryCard: {
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 20,
    marginTop: 20,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: "#e5e7eb",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  summaryLabel: {
    fontSize: 12,
    color: "#6b7280",
    fontWeight: "600",
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginBottom: 8,
  },
  summaryTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: "#111827",
    marginBottom: 6,
  },
  subtitle: { fontSize: 16, color: "#6b7280", marginBottom: 20 },
  priceLine: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: "#e5e7eb",
  },
  priceLabel: { fontSize: 16, color: "#6b7280", fontWeight: "600" },
  priceAmount: { fontSize: 24, fontWeight: "700", color: "#8b5cf6" },
  section: { marginBottom: 28 },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 8,
  },
  sectionTitle: { fontSize: 18, fontWeight: "700", color: "#111827" },
  sectionSubtitle: { fontSize: 14, color: "#6b7280", marginBottom: 12 },
  charCounter: { fontSize: 14, color: "#9ca3af", fontWeight: "500" },
  messageInput: {
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    color: "#111827",
    minHeight: 120,
    borderWidth: 1,
    borderColor: "#e5e7eb",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 1,
  },
  paymentBox: {
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: "#e5e7eb",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 1,
  },
  securityNotice: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 12,
    paddingHorizontal: 16,
    backgroundColor: "#f9fafb",
    borderRadius: 8,
    marginBottom: 20,
  },
  securityText: { fontSize: 13, color: "#6b7280", fontWeight: "500" },
  bottomBar: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: "#fff",
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: Platform.OS === "ios" ? 32 : 16,
    borderTopWidth: 1,
    borderTopColor: "#e5e7eb",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 8,
  },
  totalSection: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  totalLabel: { fontSize: 16, color: "#6b7280", fontWeight: "600" },
  totalAmount: { fontSize: 28, fontWeight: "700", color: "#111827" },
  payButton: {
    backgroundColor: "#8b5cf6",
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: "center",
    shadowColor: "#8b5cf6",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  payButtonDisabled: { opacity: 0.6 },
  payButtonText: { color: "#fff", fontSize: 18, fontWeight: "700" },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#f9fafb",
  },
  loadingText: { marginTop: 12, fontSize: 16, color: "#6b7280" },
  errorText: { fontSize: 18, color: "#ef4444", marginBottom: 16 },
  retryButton: {
    paddingHorizontal: 24,
    paddingVertical: 12,
    backgroundColor: "#8b5cf6",
    borderRadius: 8,
  },
  retryButtonText: { color: "#fff", fontSize: 16, fontWeight: "600" },
  processingOverlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "rgba(255, 255, 255, 0.95)",
    justifyContent: "center",
    alignItems: "center",
    zIndex: 1000,
  },
  processingText: { marginTop: 12, fontSize: 16, color: "#6b7280", fontWeight: "500" },
});