import React, { useState, useMemo, useEffect } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  Image,
  StyleSheet,
  TextInput,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { LinearGradient } from 'expo-linear-gradient';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import MainScreen from '../MainScreen'; // Assuming this path is correct
import { getAuth } from 'firebase/auth';
import { doc, getDoc, updateDoc, arrayUnion, arrayRemove, collection, getDocs } from 'firebase/firestore';
import { db } from '../../services/firebase'; // Assuming this path is correct
import { Ionicons } from '@expo/vector-icons';
// This is required for the gradient text effect
import MaskedView from '@react-native-masked-view/masked-view';

// Mocking types for the example
type ExperienceCategory = 'adventure' | 'wellness' | 'food-culture' | 'entertainment';
type Experience = {
  id: string;
  title: string;
  description: string;
  imageUrl: string;
  category: ExperienceCategory;
  price: number;
};
type GiverStackParamList = {
  CategorySelection: undefined;
  ExperienceDetails: { experience: Experience };
};
// End of mock types

type Category = { id: ExperienceCategory; title: string; experiences: Experience[] };
type GiverNavigationProp = NativeStackNavigationProp<GiverStackParamList, 'CategorySelection'>;

const ExperienceCard = ({
  experience,
  onPress,
  onToggleWishlist,
  isWishlisted,
}: {
  experience: Experience;
  onPress: () => void;
  onToggleWishlist: () => void;
  isWishlisted: boolean;
}) => (
  <TouchableOpacity activeOpacity={0.9} onPress={onPress} style={styles.experienceCard}>
    <View style={styles.cardImageContainer}>
      <Image source={{ uri: experience.imageUrl }} style={styles.cardImage} resizeMode="cover" />

      <TouchableOpacity
        onPress={(e) => {
          e.stopPropagation();
          onToggleWishlist();
        }}
        style={styles.heartButton}
      >
        <Ionicons
          name={isWishlisted ? 'heart' : 'heart-outline'}
          size={22}
          color={isWishlisted ? '#ef4444' : '#fff'}
        />
      </TouchableOpacity>
    </View>

    {/* --- 1. MODIFIED CARD CONTENT LAYOUT --- */}
    <View style={styles.cardContent}>
      {/* Group title and description */}
      <View>
        <Text style={styles.cardTitle} numberOfLines={1}>
          {experience.title}
        </Text>
        <Text style={styles.cardDescription} numberOfLines={2}>
          {experience.description}
        </Text>
      </View>
      
      {/* Price is now separate, will be pushed to bottom */}
      <Text style={styles.cardPrice}>
        {experience.price.toFixed(2)} €
      </Text>
    </View>
  </TouchableOpacity>
);

const CategoryCarousel = ({
  category,
  onExperiencePress,
  onToggleWishlist,
  wishlist,
}: {
  category: Category;
  onExperiencePress: (experienceId: string) => void;
  onToggleWishlist: (experienceId: string) => void;
  wishlist: string[];
}) => (
  <View style={styles.categorySection}>
    <View style={styles.categoryHeaderInline}>
      <MaskedView
        style={{ height: 30 }}
        maskElement={
          <Text style={[styles.categoryTitleInline, { backgroundColor: 'transparent' }]}>
            {category.title}
          </Text>
        }
      >
        <LinearGradient
          colors={['#4c1d95', '#1e3a8a']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
        >
          <Text style={[styles.categoryTitleInline, { opacity: 0 }]}>
            {category.title}
          </Text>
        </LinearGradient>
      </MaskedView>
    </View>
    <FlatList
      data={category.experiences}
      renderItem={({ item }) => (
        <ExperienceCard
          experience={item}
          onPress={() => onExperiencePress(item.id)}
          onToggleWishlist={() => onToggleWishlist(item.id)}
          isWishlisted={wishlist.includes(item.id)}
        />
      )}
      keyExtractor={(item) => item.id}
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.carouselContentContinuous}
    />
  </View>
);

const CategorySelectionScreen = () => {
  const navigation = useNavigation<GiverNavigationProp>();
  const [searchQuery, setSearchQuery] = useState('');
  const [wishlist, setWishlist] = useState<string[]>([]);
  const [categoriesWithExperiences, setCategories] = useState<Category[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const auth = getAuth();
  const user = auth.currentUser;

  // Load experiences from Firestore
  useEffect(() => {
    const fetchExperiences = async () => {
      try {
        const snapshot = await getDocs(collection(db, 'experiences'));
        const allExperiences = snapshot.docs.map((doc) => doc.data() as Experience); 

        const grouped = allExperiences.reduce((acc, exp) => {
          if (!acc[exp.category]) acc[exp.category] = [];
          acc[exp.category].push(exp);
          return acc;
        }, {} as Record<ExperienceCategory, Experience[]>);

        const categoriesArray = Object.keys(grouped).map((cat) => ({
          id: cat as ExperienceCategory,
          title:
            cat === 'adventure'
              ? 'Adventure'
              : cat === 'relaxation'
              ? 'Wellness'
              : cat === 'creative'
              ? 'Creative'
              : 'Entertainment',
          experiences: grouped[cat as ExperienceCategory],
        }));

        setCategories(categoriesArray);
      } catch (error) {
        console.error('Error fetching experiences:', error);
        Alert.alert('Error', 'Could not load experiences.');
      } finally {
        setIsLoading(false);
      }
    };

    fetchExperiences();
  }, []);

  // Load wishlist from Firestore
  useEffect(() => {
    const fetchWishlist = async () => {
      if (!user) return;
      const userRef = doc(db, 'users', user.uid);
      const userSnap = await getDoc(userRef);
      if (userSnap.exists()) {
        const data = userSnap.data();
        setWishlist(data.wishlist || []);
      }
    };
    fetchWishlist();
  }, [user]);

  const toggleWishlist = async (experienceId: string) => {
    if (!user) {
      Alert.alert('Please log in to use wishlist.');
      return;
    }

    const userRef = doc(db, 'users', user.uid);
    const isAlreadyWishlisted = wishlist.includes(experienceId);

    try {
      if (isAlreadyWishlisted) {
        await updateDoc(userRef, { wishlist: arrayRemove(experienceId) });
        setWishlist((prev) => prev.filter((id) => id !== experienceId));
      } else {
        await updateDoc(userRef, { wishlist: arrayUnion(experienceId) });
        setWishlist((prev) => [...prev, experienceId]);
      }
    } catch (error) {
      console.error('Error updating wishlist:', error);
      Alert.alert('Error', 'Failed to update wishlist. Please try again.');
    }
  };
  const headerColors = ['#462088ff', '#2c71c0ff'] as const;

  const filteredCategories = useMemo(() => {
    if (!searchQuery.trim()) return categoriesWithExperiences;
    return categoriesWithExperiences
      .map((category) => ({
        ...category,
        experiences: category.experiences.filter(
          (experience) =>
            experience.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
            experience.description.toLowerCase().includes(searchQuery.toLowerCase())
        ),
      }))
      .filter((category) => category.experiences.length > 0);
  }, [searchQuery, categoriesWithExperiences]);

  const handleExperiencePress = (experienceId: string) => {
    const experience = categoriesWithExperiences
      .flatMap((cat) => cat.experiences)
      .find((exp) => exp.id === experienceId);
    if (!experience) return;

    navigation.navigate('ExperienceDetails', { experience });
  };

  return (
    <MainScreen activeRoute="Home">
      <StatusBar style="light" />
      {/* <LinearGradient
                colors={headerColors}
                start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
                style={styles.header}
              > */}
      <LinearGradient colors={headerColors} style={styles.gradientHeader}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Find an Experience</Text>
          <Text style={styles.headerSubtitle}>Select a gift they'll never forget</Text>

          <View style={styles.searchBar}>
            <Text style={styles.searchIcon}>🔍</Text>
            <TextInput
              style={styles.searchInput}
              placeholder="Search experiences..."
              placeholderTextColor="#c7d2fe"
              value={searchQuery}
              onChangeText={setSearchQuery}
            />
          </View>
        </View>
      </LinearGradient>

      {isLoading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#4c1d95" />
        </View>
      ) : (
        <FlatList
          style={styles.listContainer}
          data={filteredCategories}
          renderItem={({ item }) => (
            <CategoryCarousel
              category={item}
              onExperiencePress={handleExperiencePress}
              onToggleWishlist={toggleWishlist}
              wishlist={wishlist}
            />
          )}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.categoriesListMoved}
          showsVerticalScrollIndicator={false}
        />
      )}
    </MainScreen>
  );
};

const styles = StyleSheet.create({
  gradientHeader: {
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
    overflow: 'hidden',
    paddingBottom: 18,
    paddingTop: 28,
  },
  header: {
    paddingHorizontal: 24,
    paddingTop: 34,
    paddingBottom: 10,
  },
  headerTitle: {
    fontSize: 26,
    fontWeight: 'bold',
    color: '#ffffff',
    marginBottom: 4,
  },
  headerSubtitle: {
    fontSize: 15,
    color: '#e0e7ff',
    marginBottom: 12,
  },
  searchBar: {
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    borderRadius: 12,
    paddingHorizontal: 14,
    flexDirection: 'row',
    alignItems: 'center',
  },
  searchIcon: {
    fontSize: 16,
    marginRight: 8,
    color: '#c7d2fe',
  },
  searchInput: {
    flex: 1,
    fontSize: 15,
    color: '#fff',
    paddingVertical: 10,
  },
  categoriesListMoved: {
    paddingTop: 10,
    paddingBottom: 12,
  },
  categorySection: {
    marginBottom: 10,
  },
  categoryHeaderInline: {
    paddingHorizontal: 24,
    paddingVertical: 8,
    backgroundColor: '#f8fafc',
  },
  categoryTitleInline: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#111827',
  },
  carouselContentContinuous: {
    paddingHorizontal: 24,
    paddingVertical: 8,
  },
  experienceCard: {
    marginRight: 12,
    width: 160,
    backgroundColor: '#ffffff',
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 6,
    elevation: 4,
    overflow: 'hidden',
    height: 200, // <-- 2. ADDED FIXED HEIGHT
  },
  cardImageContainer: {
    position: 'relative',
  },
  cardImage: {
    width: '100%',
    height: 100,
    backgroundColor: '#e5e7eb',
  },
  heartButton: {
    position: 'absolute',
    top: 8,
    right: 8,
    backgroundColor: 'rgba(0,0,0,0.4)',
    padding: 6,
    borderRadius: 20,
  },
  cardContent: {
    padding: 10,
    flex: 1, // <-- 3. ADDED FLEX
    justifyContent: 'space-between', // <-- 3. ADDED JUSTIFYCONTENT
  },
  cardTitle: {
    color: '#111827',
    fontWeight: 'bold',
    fontSize: 15,
    marginBottom: 3,
  },
  cardDescription: {
    color: '#6b7280',
    fontSize: 13,
    lineHeight: 18,
    // marginBottom: 6, // <-- 4. REMOVED MARGIN
  },
  cardPrice: {
    color: '#166534',
    fontSize: 16,
    fontWeight: 'bold',
    textAlign: 'right',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  listContainer: {
    flex: 1,
  },
});

export default CategorySelectionScreen;