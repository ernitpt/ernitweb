import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  Image,
  StyleSheet,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { useNavigation, useRoute } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { GiverStackParamList, ExperienceCategory, Experience } from '../../types';
import MainScreen from '../MainScreen';

type ExperienceListNavigationProp = NativeStackNavigationProp<
  GiverStackParamList,
  'ExperienceList'
>;

    // Mock data
    const mockExperiences: Record<ExperienceCategory, Experience[]> = {
      adventure: [
        {
          id: '1',
          title: 'Mountain Hiking Adventure',
          description:
            'A guided hiking experience through scenic mountain trails with breathtaking views.',
          category: 'adventure',
          price: 150,
          imageUrl: 'https://images.unsplash.com/photo-1551632811-561732d1e306?w=400',
          duration: '6 hours',
          location: 'Blue Ridge Mountains',
          partnerId: '3pMpt0tPULThJB4NWt4Gl4dF6aR2',
        },
        {
          id: '2',
          title: 'White Water Rafting',
          description:
            'Thrilling white water rafting experience for adrenaline seekers.',
          category: 'adventure',
          price: 200,
          imageUrl: 'https://images.unsplash.com/photo-1544551763-46a013bb70d5?w=400',
          duration: '4 hours',
          location: 'Colorado River',
          partnerId: '3pMpt0tPULThJB4NWt4Gl4dF6aR2',
        },
      ],
      relaxation: [
        {
          id: '3',
          title: 'Spa Day Retreat',
          description:
            'Full day spa experience with massage, facial, and relaxation treatments.',
          category: 'relaxation',
          price: 300,
          imageUrl: 'https://images.unsplash.com/photo-1540555700478-4be289fbecef?w=400',
          duration: '6 hours',
          location: 'Luxury Spa Resort',
          partnerId: '3pMpt0tPULThJB4NWt4Gl4dF6aR2',
        },
        {
          id: '4',
          title: 'Meditation & Yoga Session',
          description:
            'Guided meditation and yoga session in a peaceful garden setting.',
          category: 'relaxation',
          price: 80,
          imageUrl: 'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=400',
          duration: '2 hours',
          location: 'Zen Garden Studio',
          partnerId: '3pMpt0tPULThJB4NWt4Gl4dF6aR2',
        },
      ],
      'food-culture': [
        {
          id: '5',
          title: "Chef's Table Experience",
          description:
            'Exclusive dining experience with a renowned chef in an intimate setting.',
          category: 'food-culture',
          price: 250,
          imageUrl: 'https://images.unsplash.com/photo-1414235077428-338989a2e8c0?w=400',
          duration: '3 hours',
          location: 'Fine Dining Restaurant',
          partnerId: '3pMpt0tPULThJB4NWt4Gl4dF6aR2',
        },
        {
          id: '6',
          title: 'Cultural Food Tour',
          description:
            'Guided tour through local markets and authentic restaurants.',
          category: 'food-culture',
          price: 120,
          imageUrl: 'https://images.unsplash.com/photo-1555939594-58d7cb561ad1?w=400',
          duration: '4 hours',
          location: 'Historic District',
          partnerId: '3pMpt0tPULThJB4NWt4Gl4dF6aR2',
        },
      ],
      'romantic-getaway': [
        {
          id: '7',
          title: 'Sunset Dinner Cruise',
          description:
            'Romantic dinner cruise with stunning sunset views and live music.',
          category: 'romantic-getaway',
          price: 180,
          imageUrl: 'https://images.unsplash.com/photo-1544551763-46a013bb70d5?w=400',
          duration: '3 hours',
          location: 'Harbor Bay',
          partnerId: '3pMpt0tPULThJB4NWt4Gl4dF6aR2',
        },
        {
          id: '8',
          title: 'Wine Tasting Experience',
          description:
            'Private wine tasting session with sommelier in a cozy vineyard.',
          category: 'romantic-getaway',
          price: 160,
          imageUrl: 'https://images.unsplash.com/photo-1506377247377-2a5b3b417ebb?w=400',
          duration: '2 hours',
          location: 'Local Vineyard',
          partnerId: '3pMpt0tPULThJB4NWt4Gl4dF6aR2',
        },
      ],
      'foreign-trip': [
        {
          id: '9',
          title: 'Paris City Tour',
          description:
            'Guided tour of Paris landmarks including Eiffel Tower and Louvre.',
          category: 'foreign-trip',
          price: 400,
          imageUrl: 'https://images.unsplash.com/photo-1502602898536-47ad22581b52?w=400',
          duration: '2 days',
          location: 'Paris, France',
          partnerId: '3pMpt0tPULThJB4NWt4Gl4dF6aR2',
        },
        {
          id: '10',
          title: 'Tokyo Cultural Experience',
          description:
            'Immersive cultural experience including temples, markets, and traditional activities.',
          category: 'foreign-trip',
          price: 350,
          imageUrl: 'https://images.unsplash.com/photo-1540959733332-eab4deabeeaf?w=400',
          duration: '3 days',
          location: 'Tokyo, Japan',
          partnerId: '3pMpt0tPULThJB4NWt4Gl4dF6aR2',
        },
      ],
    };

const ExperienceListScreen = () => {
  const navigation = useNavigation<ExperienceListNavigationProp>();
  const route = useRoute();
  const { category } = route.params as { category: ExperienceCategory };

  const experiences = mockExperiences[category];

  const handleExperiencePress = (experience: Experience) => {
    navigation.navigate('ExperienceDetails', { experience });
  };

  const getCategoryTitle = (cat: ExperienceCategory) => {
    const categoryMap = {
      adventure: 'Adventure',
      relaxation: 'Relaxation',
      'food-culture': 'Food & Culture',
      'romantic-getaway': 'Romantic Getaway',
      'foreign-trip': 'Foreign Trip',
    };
    return categoryMap[cat];
  };

  return (
    <MainScreen activeRoute="Home">
      <StatusBar style="dark" />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Text style={styles.backText}>← Back</Text>
        </TouchableOpacity>
        <Text style={styles.title}>{getCategoryTitle(category)}</Text>
        <Text style={styles.subtitle}>Choose an experience to gift</Text>
      </View>

      {/* Experience List */}
      <ScrollView style={styles.scrollContainer}>
        <View style={styles.experienceList}>
          {experiences.map((experience) => (
            <TouchableOpacity
              key={experience.id}
              onPress={() => handleExperiencePress(experience)}
              style={styles.card}
              activeOpacity={0.8}
            >
              <Image
                source={{ uri: experience.imageUrl }}
                style={styles.image}
                resizeMode="cover"
              />
              <View style={styles.cardContent}>
                <Text style={styles.cardTitle}>{experience.title}</Text>
                <Text style={styles.cardDescription}>{experience.description}</Text>
                <View style={styles.cardFooter}>
                  <View>
                    <Text style={styles.metaText}>{experience.duration}</Text>
                    <Text style={styles.metaText}>{experience.location}</Text>
                  </View>
                  <Text style={styles.price}>${experience.price}</Text>
                </View>
              </View>
            </TouchableOpacity>
          ))}
        </View>
      </ScrollView>
    </MainScreen>
  );
};

const styles = StyleSheet.create({
  header: {
    backgroundColor: '#fff',
    paddingHorizontal: 24,
    paddingVertical: 16,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  backButton: {
    marginBottom: 8,
  },
  backText: {
    color: '#7C3AED',
    fontSize: 18,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#111827',
  },
  subtitle: {
    color: '#6B7280',
    marginTop: 4,
    fontSize: 14,
  },
  scrollContainer: {
    flex: 1,
    paddingHorizontal: 24,
    paddingVertical: 24,
  },
  experienceList: {
    gap: 16,
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#f3f4f6',
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 1,
    overflow: 'hidden',
  },
  image: {
    width: '100%',
    height: 180,
  },
  cardContent: {
    padding: 16,
  },
  cardTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#111827',
    marginBottom: 6,
  },
  cardDescription: {
    color: '#6B7280',
    marginBottom: 10,
    fontSize: 14,
  },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  metaText: {
    color: '#9CA3AF',
    fontSize: 12,
  },
  price: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#7C3AED',
  },
});

export default ExperienceListScreen;
