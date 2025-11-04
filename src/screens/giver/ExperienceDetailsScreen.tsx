import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  Image,
  TextInput,
  Alert,
  StyleSheet,
  Platform,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { LinearGradient } from 'expo-linear-gradient';
import { useNavigation, useRoute } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { WebView } from 'react-native-webview';
import { Ionicons } from '@expo/vector-icons';

import {
  GiverStackParamList,
  Experience,
  ExperienceGift,
} from '../../types';
import { useApp } from '../../context/AppContext';
import MainScreen from '../MainScreen';
import { experienceGiftService } from '../../services/ExperienceGiftService';
import { partnerService } from '../../services/PartnerService';
import { PartnerUser } from '../../types';

type ExperienceDetailsNavigationProp = NativeStackNavigationProp<
  GiverStackParamList,
  'ExperienceDetails'
>;

const ExperienceDetailsScreen = () => {
  const navigation = useNavigation<ExperienceDetailsNavigationProp>();
  const route = useRoute();
  const { experience } = route.params as { experience: Experience };
  const { state, dispatch } = useApp();

  const [personalizedMessage, setPersonalizedMessage] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [partner, setPartner] = useState<PartnerUser | null>(null);
  const [loadingPartner, setLoadingPartner] = useState(true);

  useEffect(() => {
    const loadPartner = async () => {
      try {
        const p = await partnerService.getPartnerById(experience.partnerId);
        setPartner(p);
      } catch (e) {
        console.log('Error loading partner', e);
      } finally {
        setLoadingPartner(false);
      }
    };
    loadPartner();
  }, [experience.partnerId]);

  const handlePurchase = async () => {
    if (!personalizedMessage.trim()) {
      Alert.alert('Error', 'Please add a personalized message');
      return;
    }

    setIsSubmitting(true);

    const experienceGiftData: ExperienceGift = {
      id: Date.now().toString(),
      giverId: state.user?.id || '',
      giverName: state.user?.displayName || '',
      experienceId: experience.id,
      experience,
      partnerId: experience.partnerId || '',
      personalizedMessage,
      deliveryDate: new Date(),
      status: 'pending',
      createdAt: new Date(),
      claimCode: Math.random().toString(36).substring(2, 8).toUpperCase(),
    };

    try {
      const experienceGift = await experienceGiftService.createExperienceGift(
        experienceGiftData as ExperienceGift
      );
      dispatch({ type: 'SET_EXPERIENCE_GIFT', payload: experienceGift });
      navigation.navigate('Confirmation', { experienceGift });
    } catch (err) {
      console.error('Failed to create experience gift:', err);
      Alert.alert('Error', 'Failed to create gift. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const getCategoryTitle = (category: string) => {
    const categoryMap = {
      adventure: 'Adventure',
      relaxation: 'Relaxation',
      'food-culture': 'Food & Culture',
      'romantic-getaway': 'Romantic Getaway',
      'foreign-trip': 'Foreign Trip',
    };
    return categoryMap[category as keyof typeof categoryMap] || category;
  };

  return (
    <MainScreen activeRoute="Home">
      <StatusBar style="light" />
      <LinearGradient colors={['#7C3AED', '#3B82F6']} style={styles.gradient}>
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={{ paddingBottom: 40, paddingTop: 60 }}
        >
          {/* Header */}
          <View style={styles.header}>
            <TouchableOpacity
              onPress={() => navigation.goBack()}
              style={styles.backButton}
              activeOpacity={0.8}
            >
              <Ionicons name="chevron-back" size={22} color="#fff" />
              <Text style={styles.backText}>Back</Text>
            </TouchableOpacity>
            <View style={{ width: 50 }} />
          </View>

          {/* Experience Image */}
          <View style={styles.imageContainer}>
            <Image
              source={{ uri: experience.imageUrl }}
              style={styles.image}
              resizeMode="cover"
            />
          </View>

          {/* Unified Info + Map card */}
          <View style={styles.card}>
            <Text style={styles.cardTitle}>{experience.title}</Text>
            <Text style={styles.cardCategory}>
              {getCategoryTitle(experience.category)}
            </Text>
            <Text style={styles.cardDescription}>{experience.description}</Text>

            <View style={styles.infoRow}>
              <View>
                <Text style={styles.infoLabel}>Price</Text>
                <Text style={styles.infoPrice}>${experience.price}</Text>
              </View>
            </View>

            {/* Partner + Map */}
            {!loadingPartner && partner?.mapsUrl ? (
              <View style={{ marginTop: 20 }}>
                <Text style={styles.sectionTitle}>
                  Location – {partner.name ?? 'Partner'}
                </Text>

                {partner.address ? (
                  <Text style={styles.addressText}>
                    <Text style={styles.pinIcon}>📍 </Text>
                    {partner.address}
                  </Text>
                ) : null}

                <View style={styles.mapContainer}>
                  <WebView
                    originWhitelist={['*']}
                    source={{
                      html: `
                        <html>
                          <head>
                            <meta name="viewport" content="initial-scale=1.0, width=device-width" />
                          </head>
                          <body style="margin:0;padding:0;overflow:hidden;">
                            <iframe
                              src="${partner.mapsUrl}"
                              width="100%"
                              height="100%"
                              style="border:0;"
                              allowfullscreen=""
                              loading="lazy"
                              referrerpolicy="no-referrer-when-downgrade">
                            </iframe>
                          </body>
                        </html>
                      `,
                    }}
                    style={{ flex: 1, borderRadius: 12 }}
                  />
                </View>
              </View>
            ) : null}
          </View>

          {/* Personalization */}
          <View style={styles.card}>
            <Text style={styles.sectionTitle}>Personalize Your Gift</Text>

            <View style={{ marginBottom: 16 }}>
              <TextInput
                style={[styles.textInput, styles.multilineInput]}
                placeholder="Write a personal message for the recipient..."
                placeholderTextColor="#E5E7EB"
                value={personalizedMessage}
                onChangeText={setPersonalizedMessage}
                multiline
                textAlignVertical="top"
                editable={!isSubmitting}
              />
            </View>
          </View>

          {/* Purchase Button */}
          <View style={{ paddingHorizontal: 24, marginBottom: 48 }}>
            <TouchableOpacity
              onPress={handlePurchase}
              activeOpacity={0.9}
              style={[
                styles.purchaseButton,
                isSubmitting ? { opacity: 0.7 } : undefined,
              ]}
              disabled={isSubmitting}
            >
              <Text style={styles.purchaseText}>
                {isSubmitting
                  ? 'Processing...'
                  : `Purchase Gift – $${experience.price}`}
              </Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </LinearGradient>
    </MainScreen>
  );
};

const styles = StyleSheet.create({
  gradient: { flex: 1 },
  scrollView: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    marginBottom: 12,
  },
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 6,
    paddingHorizontal: 10,
  },
  backText: {
    color: '#fff',
    fontSize: 17,
    fontWeight: '600',
    marginLeft: 2,
  },
  imageContainer: {
    marginHorizontal: 16,
    marginBottom: 16,
    borderRadius: 24,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  image: { width: '100%', height: 256 },
  card: {
    backgroundColor: 'rgba(255,255,255,0.1)',
    marginHorizontal: 16,
    marginBottom: 16,
    borderRadius: 16,
    padding: 24,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
  },
  cardTitle: {
    color: '#fff',
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  cardCategory: {
    color: '#c4b5fd',
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 12,
  },
  cardDescription: {
    color: 'rgba(255,255,255,0.9)',
    fontSize: 16,
    marginBottom: 16,
    lineHeight: 24,
  },
  infoRow: { flexDirection: 'row', justifyContent: 'space-between' },
  infoLabel: { color: '#c4b5fd', fontSize: 14 },
  infoPrice: { color: '#fff', fontSize: 20, fontWeight: 'bold' },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 8,
  },
  addressText: {
    color: 'rgba(255,255,255,0.9)',
    fontSize: 15,
    marginBottom: 12,
  },
  pinIcon: { fontSize: 16 },
  textInput: {
    backgroundColor: 'rgba(255,255,255,0.2)',
    color: '#fff',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.3)',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
  },
  multilineInput: {
    minHeight: 100,
    paddingTop: 12,
  },
  purchaseButton: {
    backgroundColor: '#fff',
    borderRadius: 12,
    paddingVertical: 16,
  },
  purchaseText: {
    color: '#7c3aed',
    fontSize: 18,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  mapContainer: {
    height: 200,
    borderRadius: 12,
    overflow: 'hidden',
  },
});

export default ExperienceDetailsScreen;
