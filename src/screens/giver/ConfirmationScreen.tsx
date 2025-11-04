import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  Image,
  Alert,
  StyleSheet,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import * as Clipboard from 'expo-clipboard';
import { useNavigation, useRoute } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { GiverStackParamList, ExperienceGift } from '../../types';
import { useApp } from '../../context/AppContext';
import MainScreen from '../MainScreen';
import CopyIcon from '../../assets/icons/copy.svg';

type ConfirmationNavigationProp = NativeStackNavigationProp<
  GiverStackParamList,
  'Confirmation'
>;

const ConfirmationScreen = () => {
  const navigation = useNavigation<ConfirmationNavigationProp>();
  const route = useRoute();
  const { experienceGift } = route.params as { experienceGift: ExperienceGift };
  const { dispatch } = useApp();

  const handleCopyCode = async () => {
    await Clipboard.setStringAsync(experienceGift.claimCode);
    Alert.alert('Copied!', 'Claim code copied to clipboard.');
  };

  const handleShareCode = () => {
    Alert.alert(
      'Share Code',
      `Share this code with the recipient: ${experienceGift.claimCode}`,
      [
        { text: 'Copy Code', onPress: handleCopyCode },
        { text: 'OK' },
      ]
    );
  };

  const handleBackToHome = () => {
    // Navigate to GoalSetting screen
    navigation.reset({
      index: 0,
      routes: [{ name: 'CategorySelection'}],
    });
  };

  return (
    <MainScreen activeRoute="Home">
      <StatusBar style="dark" />
      <ScrollView style={styles.scrollView}>
        {/* Success Header */}
        <View style={styles.header}>
          <View style={styles.successIcon}>
            <Text style={styles.successEmoji}>✅</Text>
          </View>
          <Text style={styles.headerTitle}>Gift Purchased Successfully!</Text>
          <Text style={styles.headerSubtitle}>
           Your gift is ready! Share the code bellow so they can unlock
            their reward journey!
          </Text>
        </View>

        {/* Experience Summary */}
        <View style={styles.card}>
          <Image
            source={{ uri: experienceGift.experience.imageUrl }}
            style={styles.cardImage}
            resizeMode="cover"
          />
          <View style={styles.cardContent}>
            <Text style={styles.cardTitle}>{experienceGift.experience.title}</Text>
            <Text style={styles.cardDescription}>
              {experienceGift.experience.description}
            </Text>

            <View style={styles.messageBox}>
              <Text style={styles.messageLabel}>Your Message:</Text>
              <Text style={styles.messageText}>
                "{experienceGift.personalizedMessage}"
              </Text>
            </View>

            <View style={styles.infoRow}>
              <View>
                <Text style={styles.infoLabel}>Delivery Date</Text>
                <Text style={styles.infoValue}>
                  {experienceGift.deliveryDate.toLocaleDateString()}
                </Text>
              </View>
              <View>
                <Text style={styles.infoLabel}>Price</Text>
                <Text style={styles.infoPrice}>
                  ${experienceGift.experience.price}
                </Text>
              </View>
            </View>
          </View>
        </View>

        {/* Claim Code */}
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Share This Code</Text>
          <View style={styles.codeBoxRow}>
            <View style={styles.codeBox}>
              <Text style={styles.codeText}>{experienceGift.claimCode}</Text>
            </View>
            <TouchableOpacity
              style={styles.copyButton}
              onPress={handleCopyCode}
              activeOpacity={0.8}
            >
              <CopyIcon width={20} height={20}/>
            </TouchableOpacity>
          </View>
          <Text style={styles.codeHint}>
            Share this code with the recipient so they can claim their experience
          </Text>
          <TouchableOpacity
            onPress={handleShareCode}
            style={styles.shareButton}
            activeOpacity={0.8}
          >
            <Text style={styles.shareButtonText}>Share Code</Text>
          </TouchableOpacity>
        </View>

        {/* What Happens Next */}
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>What Happens Next?</Text>
          <View style={styles.stepsContainer}>
            {[
              'Recipient enters the code to claim their experience',
              'They set personal goals to earn the reward',
              'AI generates mysterious hints as they progress',
              'Experience unlocks when goals are completed',
            ].map((step, index) => (
              <View key={index} style={styles.stepRow}>
                <View style={styles.stepNumber}>
                  <Text style={styles.stepNumberText}>{index + 1}</Text>
                </View>
                <Text style={styles.stepText}>{step}</Text>
              </View>
            ))}
          </View>
        </View>

        {/* Action Buttons */}
        <View style={styles.actions}>
          <TouchableOpacity
            onPress={handleBackToHome}
            style={styles.backButton}
            activeOpacity={0.8}
          >
            <Text style={styles.backButtonText}>Back to Home</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </MainScreen>
  );
};

const styles = StyleSheet.create({
  scrollView: { flex: 1, backgroundColor: '#f3f4f6' },
  header: {
    backgroundColor: '#fff',
    paddingHorizontal: 24,
    paddingTop: 64,
    paddingBottom: 10,
    alignItems: 'center',
  },
  successIcon: {
    width: 80,
    height: 80,
    backgroundColor: '#d1fae5',
    borderRadius: 40,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  successEmoji: { fontSize: 36 },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#111827',
    marginBottom: 4,
  },
  headerSubtitle: { fontSize: 14, color: '#6b7280', textAlign: 'center', paddingTop: 8, },

  card: {
    backgroundColor: '#fff',
    borderRadius: 16,
    marginHorizontal: 24,
    marginTop: 16,
    overflow: 'hidden',
    elevation: 2,
    padding: 16,
  },
  cardImage: { width: '100%', height: 192 },
  cardContent: { padding: 24 },
  cardTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#111827',
    marginBottom: 4,
  },
  cardDescription: { fontSize: 14, color: '#6b7280', marginBottom: 16 },

  messageBox: {
    backgroundColor: '#f5f3ff',
    padding: 16,
    borderRadius: 12,
    marginBottom: 16,
  },
  messageLabel: { fontWeight: '600', color: '#6b21a8', marginBottom: 4 },
  messageText: { fontStyle: 'italic', color: '#7c3aed' },

  infoRow: { flexDirection: 'row', justifyContent: 'space-between' },
  infoLabel: { fontSize: 12, color: '#6b7280' },
  infoValue: { fontSize: 14, fontWeight: '500', color: '#111827' },
  infoPrice: { fontSize: 20, fontWeight: 'bold', color: '#7c3aed' },

  sectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#111827',
    marginBottom: 16,
  },

  /** 🔹 Claim code area **/
  codeBoxRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  codeBox: {
    backgroundColor: '#e5e7eb',
    padding: 16,
    borderRadius: 12,
    flex: 1,
    marginRight: 8,
  },
  codeText: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#7c3aed',
    textAlign: 'center',
    letterSpacing: 4,
  },
  copyButton: {
    backgroundColor: '#7c3aed',
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 10,
  },
  copyButtonText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 14,
  },
  codeHint: {
    fontSize: 12,
    color: '#6b7280',
    textAlign: 'center',
    marginBottom: 16,
  },
  shareButton: {
    backgroundColor: '#7c3aed',
    borderRadius: 12,
    paddingVertical: 12,
  },
  shareButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
    textAlign: 'center',
  },

  stepsContainer: { marginTop: 8 },
  stepRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  stepNumber: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#ede9fe',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
    marginTop: 2,
  },
  stepNumberText: { fontSize: 12, fontWeight: 'bold', color: '#7c3aed' },
  stepText: { flex: 1, color: '#374151', fontSize: 14 },

  actions: { padding: 24 },
  backButton: {
    backgroundColor: '#6b7280',
    borderRadius: 12,
    paddingVertical: 16,
  },
  backButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
    textAlign: 'center',
  },
});

export default ConfirmationScreen;
