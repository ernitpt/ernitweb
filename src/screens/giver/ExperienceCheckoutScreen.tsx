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
import { GiverStackParamList, Experience, ExperienceGift } from "../../types";
import { stripeService } from "../../services/stripeService";
import { experienceGiftService } from "../../services/ExperienceGiftService";
import { useApp } from "../../context/AppContext";
import MainScreen from "../MainScreen";

const stripePromise = loadStripe(process.env.EXPO_PUBLIC_STRIPE_PK!);

type NavigationProp = NativeStackNavigationProp<GiverStackParamList, "ExperienceCheckout">;

function CheckoutInner({ clientSecret }: { clientSecret: string }) {
  const route = useRoute();
  const { experience } = route.params as { experience: Experience };
  const navigation = useNavigation<NavigationProp>();
  const { state, dispatch } = useApp();

  const stripe = useStripe();
  const elements = useElements();
  const [message, setMessage] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);
  const [charCount, setCharCount] = useState(0);

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
    try {
      const { error, paymentIntent } = await stripe.confirmPayment({
        elements,
        confirmParams: {
          return_url:
            Platform.OS === "web"
              ? window.location.origin + "/payment-success"
              : "https://ernit-nine.vercel.app/payment-success",
        },
        redirect: "if_required",
      });

      if (error) throw error;
      if (!paymentIntent) throw new Error("No payment intent returned.");

      if (paymentIntent.status === "succeeded") {
        const gift: ExperienceGift = {
          id: Date.now().toString(),
          giverId: state.user?.id || "",
          giverName: state.user?.displayName || "",
          experienceId: experience.id,
          partnerId: experience.partnerId,
          personalizedMessage: message,
          deliveryDate: new Date(),
          status: "pending",
          payment: "paid",
          createdAt: new Date(),
          claimCode: Math.random().toString(36).substring(2, 8).toUpperCase(),
        };

        const savedGift = await experienceGiftService.createExperienceGift(gift);
        dispatch({ type: "SET_EXPERIENCE_GIFT", payload: savedGift });
        Alert.alert("Success", "Your payment was processed successfully!");
        navigation.navigate("Confirmation", { experienceGift: savedGift });
      }
    } catch (err: any) {
      Alert.alert("Payment failed", err.message || "Something went wrong.");
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

          <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
            {/* Order Summary Card */}
            <View style={styles.summaryCard}>
              <Text style={styles.summaryLabel}>Your Experience</Text>
              <Text style={styles.summaryTitle}>{experience.title}</Text>
              <Text style={styles.subtitle}>{experience.subtitle}</Text>
              <View style={styles.priceLine}>
                <Text style={styles.priceLabel}>Total Amount</Text>
                <Text style={styles.priceAmount}>€{experience.price.toFixed(2)}</Text>
              </View>
            </View>

            {/* Personal Message Section */}
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

            {/* Payment Section */}
            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <CreditCard color="#8b5cf6" size={20} />
                <Text style={[styles.sectionTitle, { marginLeft: 8 }]}>Payment Details</Text>
              </View>
              <View style={styles.paymentBox}>
                <PaymentElement />
              </View>
            </View>

            {/* Security Notice */}
            <View style={styles.securityNotice}>
              <Lock color="#6b7280" size={16} />
              <Text style={styles.securityText}>
                Your payment information is encrypted and secure
              </Text>
            </View>

            <View style={{ height: 120 }} />
          </ScrollView>

          {/* Fixed Bottom CTA */}
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
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const init = async () => {
      try {
        const secret = await stripeService.createPaymentIntent(
          experience.price,
          experience.id,
          state.user?.id || ""
        );
        setClientSecret(secret);
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
      <View style={styles.loadingContainer}>
        <ActivityIndicator color="#8b5cf6" size="large" />
        <Text style={styles.loadingText}>Setting up checkout...</Text>
      </View>
    );
  }

  if (!clientSecret) {
    return (
      <View style={styles.loadingContainer}>
        <Text style={styles.errorText}>Could not initialize payment.</Text>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.retryButton}>
          <Text style={styles.retryButtonText}>Go Back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <Elements stripe={stripePromise} options={{ clientSecret }}>
      <CheckoutInner clientSecret={clientSecret} />
    </Elements>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f9fafb",
  },
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
  scrollView: {
    flex: 1,
    paddingHorizontal: 20,
  },
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
  priceLine: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: "#e5e7eb",
  },
  priceLabel: {
    fontSize: 16,
    color: "#6b7280",
    fontWeight: "600",
  },
  priceAmount: {
    fontSize: 24,
    fontWeight: "700",
    color: "#8b5cf6",
  },
  section: {
    marginBottom: 28,
  },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 8,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#111827",
  },
  sectionSubtitle: {
    fontSize: 14,
    color: "#6b7280",
    marginBottom: 12,
  },
  charCounter: {
    fontSize: 14,
    color: "#9ca3af",
    fontWeight: "500",
  },
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
  securityText: {
    fontSize: 13,
    color: "#6b7280",
    fontWeight: "500",
  },
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
  totalLabel: {
    fontSize: 16,
    color: "#6b7280",
    fontWeight: "600",
  },
  totalAmount: {
    fontSize: 28,
    fontWeight: "700",
    color: "#111827",
  },
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
  payButtonDisabled: {
    opacity: 0.6,
  },
  payButtonText: {
    color: "#fff",
    fontSize: 18,
    fontWeight: "700",
  },
    subtitle: {
    fontSize: 16,
    color: "#6b7280",
    marginBottom: 20,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#f9fafb",
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: "#6b7280",
  },
  errorText: {
    fontSize: 18,
    color: "#ef4444",
    marginBottom: 16,
  },
  retryButton: {
    paddingHorizontal: 24,
    paddingVertical: 12,
    backgroundColor: "#8b5cf6",
    borderRadius: 8,
  },
  retryButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
  },
});