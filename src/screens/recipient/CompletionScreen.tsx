import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  Image,
  Alert,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import * as Clipboard from 'expo-clipboard';
import { useNavigation, useRoute } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import {
  RecipientStackParamList,
  Goal,
  ExperienceGift,
  PartnerCoupon,
} from '../../types';
import { useApp } from '../../context/AppContext';
import MainScreen from '../MainScreen';
import { collection, doc, setDoc, serverTimestamp, getDoc, query, where, getDocs } from 'firebase/firestore';
import { db } from '../../services/firebase';
import { goalService } from '../../services/GoalService';

type CompletionNavigationProp = NativeStackNavigationProp<
  RecipientStackParamList,
  'Completion'
>;

const CompletionScreen = () => {
  const navigation = useNavigation<CompletionNavigationProp>();
  const route = useRoute();
  const { dispatch } = useApp();

  const [couponCode, setCouponCode] = useState<string | null>(null);
  const [isCopied, setIsCopied] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isGenerating, setIsGenerating] = useState(false);

  // Safely parse params (serialized before navigation)
  const { goal: rawGoal, experienceGift: rawGift } = route.params as {
    goal: any;
    experienceGift: any;
  };

  const toDate = (value: any): Date | undefined => {
    if (!value) return undefined;
    if (value?.seconds) return new Date(value.seconds * 1000);
    const date = new Date(value);
    return isNaN(date.getTime()) ? undefined : date;
  };

  // Rehydrate goal
  const goal: Goal = {
    ...rawGoal,
    startDate: toDate(rawGoal.startDate)!,
    endDate: toDate(rawGoal.endDate)!,
    createdAt: toDate(rawGoal.createdAt)!,
    updatedAt: toDate(rawGoal.updatedAt),
    completedAt: toDate(rawGoal.completedAt),
  };

  // Rehydrate experienceGift
  const experienceGift: ExperienceGift = {
    ...rawGift,
    createdAt: toDate(rawGift.createdAt)!,
    deliveryDate: toDate(rawGift.deliveryDate)!,
    claimedAt: toDate(rawGift.claimedAt),
    completedAt: toDate(rawGift.completedAt),
  };

  // Fetch existing coupon on mount
  useEffect(() => {
    fetchExistingCoupon();
  }, []);

  const fetchExistingCoupon = async () => {
    try {
      setIsLoading(true);

      // ✅ Check goalService first
      const existingCode = await goalService.getCouponCode(goal.id);
      if (existingCode) {
        setCouponCode(existingCode);
        return;
      }
    } catch (error) {
      console.error('Error fetching existing coupon:', error);
    } finally {
      setIsLoading(false);
    }
  };


  // Generate a random 8-character coupon code
  const generateUniqueCode = () => {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    return Array.from({ length: 8 }, () =>
      chars[Math.floor(Math.random() * chars.length)]
    ).join('');
  };

  // Handle redeem (generate + upload)
  const handleRedeemNow = async () => {
    if (isGenerating) return;
    
    try {
      setIsGenerating(true);
      
      const partnerId = experienceGift?.partnerId || experienceGift?.experience?.partnerId;

      if (!partnerId) {
        Alert.alert('Error', 'This experience is missing a partner ID.');
        console.error('Missing partnerId in experienceGift:', experienceGift);
        return;
      }

      const newCouponCode = generateUniqueCode();
      const userId = goal.userId;
      const validUntil = new Date(Date.now() + 1000 * 60 * 60 * 24 * 30); // valid 30 days

      const coupon: PartnerCoupon = {
        code: newCouponCode,
        status: 'active',
        userId,
        validUntil,
        partnerId,
      };

      // Save to partner's coupons subcollection
      const partnerCouponRef = doc(
        collection(db, `partnerUsers/${partnerId}/coupons`),
        newCouponCode
      );

      await setDoc(partnerCouponRef, {
        ...coupon,
        createdAt: serverTimestamp(),
      });

      // ✅ Store coupon code in goal document via service
      await goalService.saveCouponCode(goal.id, newCouponCode);

      setCouponCode(newCouponCode);
      Alert.alert(
        '🎉 Coupon Created',
        `Your coupon code is ready! You can copy it below.`
      );
    } catch (error) {
      console.error('Error creating user coupon:', error);
      Alert.alert('Error', 'Something went wrong while generating your coupon.');
    } finally {
      setIsGenerating(false);
    }
  };

  // Copy coupon to clipboard
  const handleCopy = async () => {
    if (!couponCode) return;
    await Clipboard.setStringAsync(couponCode);
    setIsCopied(true);
    setTimeout(() => setIsCopied(false), 2000);
  };

  const getCategoryTitle = (category: string) => {
    const map = {
      adventure: 'Adventure',
      relaxation: 'Relaxation',
      'food-culture': 'Food & Culture',
      'romantic-getaway': 'Romantic Getaway',
      'foreign-trip': 'Foreign Trip',
      entertainment: 'Entertainment',
    };
    return map[category as keyof typeof map] || category;
  };

  const formatDeliveryDate = (date: any) => {
    if (!date) return 'N/A';
    if (date?.seconds) date = new Date(date.seconds * 1000);
    const jsDate = date instanceof Date ? date : new Date(date);
    return jsDate.toLocaleDateString('en-US', {
      weekday: 'short',
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
  };

  return (
    <MainScreen activeRoute="Goals">
      <StatusBar style="light" />
      <ScrollView style={styles.container}>
        {/* 🎉 Success Header */}
        <View style={styles.header}>
          <View style={styles.iconContainer}>
            <Text style={styles.icon}>🎉</Text>
          </View>
          <Text style={styles.headerTitle}>Congratulations!</Text>
          <Text style={styles.headerSubtitle}>
            You've completed your goal and unlocked your reward experience!
          </Text>
        </View>

        {/* 🏆 Goal Summary */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Goal Completed</Text>
          <Text style={styles.goalTitle}>{goal.title}</Text>
          <Text style={styles.goalDescription}>{goal.description}</Text>

          <View style={styles.statsContainer}>
            <View style={styles.statRow}>
              <Text style={styles.statLabel}>Total Sessions Completed:</Text>
              <Text style={styles.statValue}>
                {goal.sessionsPerWeek * goal.targetCount} /{' '}
                {goal.sessionsPerWeek * goal.targetCount}
              </Text>
            </View>
          </View>
        </View>

        {/* 🎁 Experience Unlocked */}
        <View style={styles.card}>
          <Text style={styles.experienceHeader}>🎁 Your Unlocked Experience</Text>
          <Image
            source={{ uri: experienceGift.experience.imageUrl }}
            style={styles.experienceImage}
            resizeMode="cover"
          />
          <View style={styles.experienceContent}>
            <Text style={styles.experienceTitle}>
              {experienceGift.experience.title}
            </Text>
            <Text style={styles.categoryBadge}>
              {getCategoryTitle(experienceGift.experience.category)}
            </Text>
            <Text style={styles.experienceDescription}>
              {experienceGift.experience.description}
            </Text>
          </View>
        </View>

        {/* 📋 Next Steps */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Next Steps</Text>
          <Text style={[styles.stepText, { marginBottom: 16  }]}>
            Contact your experience provider and share your coupon code.
          </Text>

          {isLoading ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color="#7C3AED" />
              <Text style={styles.loadingText}>Loading coupon...</Text>
            </View>
          ) : couponCode ? (
            <View>
              <View style={styles.couponContainer}>
                <Text style={styles.couponCode}>{couponCode}</Text>
                <TouchableOpacity
                  style={styles.copyButton}
                  onPress={handleCopy}
                  activeOpacity={0.8}
                >
                  <Text style={styles.copyButtonText}>
                    {isCopied ? 'Copied!' : 'Copy'}
                  </Text>
                </TouchableOpacity>
              </View>
              <Text style={styles.couponNote}>
                💡 Save this code! You'll need it to redeem your experience.
              </Text>
            </View>
          ) : (
            <TouchableOpacity
              onPress={handleRedeemNow}
              style={[styles.primaryButton, isGenerating && styles.disabledButton]}
              disabled={isGenerating}
            >
              <Text style={styles.primaryButtonText}>
                {isGenerating ? 'Generating...' : 'Generate Coupon'}
              </Text>
            </TouchableOpacity>
          )}
        </View>

        {/* 🚪 Close Button */}
        <View style={styles.buttonContainer}>
          <TouchableOpacity
            onPress={() => navigation.reset({
              index: 0,
              routes: [
                { name: 'Goals' },
              ],
            })}
            style={styles.secondaryButton}
          >
            <Text style={styles.secondaryButtonText}>Close</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </MainScreen>
  );
};

// 🎨 Styles
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F9FAFB' },
  header: {
    backgroundColor: '#10B981',
    paddingHorizontal: 24,
    paddingTop: 34,
    paddingBottom: 10,
    alignItems: 'center',
  },
  iconContainer: {
    width: 96,
    height: 96,
    backgroundColor: '#FFFFFF',
    borderRadius: 48,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 24,
  },
  icon: { fontSize: 60 },
  headerTitle: {
    fontSize: 30,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: 8,
  },
  headerSubtitle: { color: '#D1FAE5', textAlign: 'center', fontSize: 18 },
  card: {
    backgroundColor: '#FFFFFF',
    marginHorizontal: 24,
    marginTop: 24,
    borderRadius: 16,
    padding: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  cardTitle: { fontSize: 20, fontWeight: 'bold', color: '#111827', marginBottom: 16 },
  goalTitle: { fontSize: 18, color: '#1F2937', marginBottom: 8 },
  goalDescription: { color: '#6B7280', marginBottom: 16 },
  statsContainer: { backgroundColor: '#ECFDF5', padding: 16, borderRadius: 12 },
  statRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 },
  statLabel: { color: '#065F46', fontWeight: '500' },
  statValue: { color: '#065F46', fontWeight: 'bold', fontSize: 20 },
  experienceHeader: { fontSize: 20, fontWeight: 'bold', color: '#111827', paddingBottom: 8 },
  experienceImage: { width: '100%', height: 192, marginVertical: 16, borderRadius: 8 },
  experienceContent: { paddingTop: 8 },
  experienceTitle: { fontSize: 24, fontWeight: 'bold', color: '#111827', marginBottom: 8 },
  categoryBadge: { color: '#9333EA', fontWeight: '600', marginBottom: 12 },
  experienceDescription: { color: '#374151', marginBottom: 16, lineHeight: 24 },
  stepText: { color: '#374151', lineHeight: 20 },
  loadingContainer: {
    alignItems: 'center',
    paddingVertical: 20,
  },
  loadingText: {
    marginTop: 12,
    color: '#6B7280',
    fontSize: 14,
  },
  couponContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#F3E8FF',
    borderRadius: 10,
    paddingVertical: 12,
    paddingHorizontal: 16,
    marginBottom: 12,
  },
  couponCode: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#7C3AED',
    letterSpacing: 1.5,
  },
  couponNote: {
    fontSize: 14,
    color: '#6B7280',
    textAlign: 'center',
    fontStyle: 'italic',
  },
  copyButton: {
    backgroundColor: '#7C3AED',
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 8,
  },
  copyButtonText: { color: '#FFF', fontWeight: '600' },
  buttonContainer: { padding: 24 },
  primaryButton: {
    backgroundColor: '#9333EA',
    borderRadius: 12,
    paddingVertical: 16,
  },
  disabledButton: {
    backgroundColor: '#9CA3AF',
    opacity: 0.6,
  },
  primaryButtonText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '600',
    textAlign: 'center',
  },
  secondaryButton: { backgroundColor: '#4B5563', borderRadius: 12, paddingVertical: 16 },
  secondaryButtonText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '600',
    textAlign: 'center',
  },
});

export default CompletionScreen;