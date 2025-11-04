// screens/FriendProfileScreen.tsx
import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Image,
  StyleSheet,
  ActivityIndicator,
  Animated,
  Alert,
  StatusBar,
  Platform,
} from 'react-native';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList, UserProfile, Goal, Experience } from '../types';
import { userService } from '../services/userService';
import { friendService } from '../services/FriendService';
import { goalService } from '../services/GoalService';
import { useApp } from '../context/AppContext';
import MainScreen from './MainScreen';

type FriendProfileNavigationProp = NativeStackNavigationProp<
  RootStackParamList,
  'FriendProfile'
>;
type FriendProfileRouteProp = RouteProp<RootStackParamList, 'FriendProfile'>;

const FriendProfileScreen: React.FC = () => {
  const navigation = useNavigation<FriendProfileNavigationProp>();
  const route = useRoute<FriendProfileRouteProp>();
  const { state } = useApp();

  const { userId } = route.params;
  const currentUserId = state.user?.id;
  const currentUserName =
    state.user?.displayName || state.user?.profile?.name || 'User';
  const currentUserProfileImageUrl = state.user?.profile?.profileImageUrl;

  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [activeTab, setActiveTab] = useState<'goals' | 'achievements' | 'wishlist'>('goals');
  const [data, setData] = useState<(Goal | Experience)[]>([]);
  const [isFriend, setIsFriend] = useState(false);
  const [hasPendingRequest, setHasPendingRequest] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isActionLoading, setIsActionLoading] = useState(false);

  const fadeAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    loadFriendProfile();
  }, [userId]);

  useEffect(() => {
    if (userProfile) loadActiveTab();
  }, [activeTab, userProfile]);

  const animateContent = () => {
    fadeAnim.setValue(0);
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 300,
      useNativeDriver: true,
    }).start();
  };

  const loadFriendProfile = async () => {
    try {
      setIsLoading(true);
      const profile = await userService.getUserProfile(userId);
      setUserProfile(profile);

      if (currentUserId) {
        const [friendshipStatus, pendingStatus] = await Promise.all([
          friendService.areFriends(currentUserId, userId),
          friendService.hasPendingRequest(currentUserId, userId),
        ]);
        setIsFriend(friendshipStatus);
        setHasPendingRequest(pendingStatus);
      }
    } catch (error) {
      console.error('Error loading profile:', error);
      Alert.alert('Error', 'Failed to load profile. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const loadActiveTab = async () => {
    try {
      setIsLoading(true);
      animateContent();

      if (activeTab === 'wishlist') {
        const wishlist = (await userService.getWishlist(userId)) || [];
        setData(wishlist);
        return;
      }

      const allGoals = await goalService.getUserGoals(userId);
      if (activeTab === 'goals') {
        setData(allGoals.filter(g => !g.isCompleted));
      } else {
        setData(allGoals.filter(g => g.isCompleted));
      }
    } catch (error) {
      console.error('Error loading tab data:', error);
      Alert.alert('Error', 'Failed to load data. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSendFriendRequest = async () => {
    if (!currentUserId || !userProfile) return;
    try {
      setIsActionLoading(true);
      await friendService.sendFriendRequest(
        currentUserId,
        currentUserName,
        currentUserProfileImageUrl,
        userId,
        userProfile.name
      );
      setHasPendingRequest(true);
      Alert.alert('Success', `Friend request sent to ${userProfile.name}!`);
    } catch (error) {
      console.error('Error sending friend request:', error);
      Alert.alert('Error', 'Failed to send friend request. Please try again.');
    } finally {
      setIsActionLoading(false);
    }
  };

  const handleRemoveFriend = async () => {
    if (!currentUserId || !userProfile) return;
    Alert.alert(
      'Remove Friend',
      `Are you sure you want to remove ${userProfile.name}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: async () => {
            try {
              setIsActionLoading(true);
              await friendService.removeFriend(currentUserId, userId);
              setIsFriend(false);
              Alert.alert('Removed', `${userProfile.name} was removed.`);
            } catch (error) {
              console.error('Error removing friend:', error);
              Alert.alert('Error', 'Failed to remove friend.');
            } finally {
              setIsActionLoading(false);
            }
          },
        },
      ]
    );
  };

  // === GOAL CARD (same as before – unchanged) ===
  const GoalCard = ({ goal }: { goal: Goal }) => {
    const weekPct = goalService.getWeeklyProgress(goal);

    return (
      <View style={styles.goalCard}>
        <Text style={styles.goalTitle}>{goal.title}</Text>
        <View style={styles.weekBarTrack}>
          <View style={[styles.weekBarFill, { width: `${weekPct}%` }]} />
        </View>
        <Text style={styles.goalDetailText}>
          This week: {goal.weeklyCount}/{goal.sessionsPerWeek}
        </Text>
      </View>
    );
  };

  // ✅ NEW — WISHLIST CARD (identical to UserProfile)
  const ExperienceCard = ({ experience }: { experience: Experience }) => {
    const navigation = useNavigation<FriendProfileNavigationProp>();

    const handlePress = () => {
      navigation.navigate('ExperienceDetails', { experience });
    };

    return (
      <TouchableOpacity
        activeOpacity={0.8}
        style={styles.experienceCard}
        onPress={handlePress}
      >
        <Image
          source={{ uri: experience.imageUrl }}
          style={styles.experienceImage}
          resizeMode="cover"
        />
        <View style={styles.experienceContent}>
          <Text style={styles.experienceTitle} numberOfLines={1}>
            {experience.title}
          </Text>
          <Text style={styles.experienceDescription} numberOfLines={2}>
            {experience.description}
          </Text>
          <Text style={styles.experiencePrice}>
            ${Number(experience.price || 0).toFixed(2)}
          </Text>
        </View>
      </TouchableOpacity>
    );
  };

  // === ACHIEVEMENTS (unchanged) ===
  const AchievementCard = ({ goal }: { goal: Goal }) => {
    const [giverName, setGiverName] = useState<string | null>(null);
    useEffect(() => {
      if (goal.empoweredBy) {
        userService.getUserName(goal.empoweredBy).then(setGiverName);
      }
    }, [goal.empoweredBy]);
    return (
      <View style={styles.goalCard}>
        <Text style={styles.goalTitle}>{goal.title}</Text>
        {giverName && (
          <Text style={styles.goalDetailText}>⚡ Empowered by {giverName}</Text>
        )}
      </View>
    );
  };

  if (isLoading && !userProfile) {
    return (
      <MainScreen activeRoute="Profile">
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#8b5cf6" />
          <Text style={styles.loadingText}>Loading profile...</Text>
        </View>
      </MainScreen>
    );
  }

  return (
    <MainScreen activeRoute="Profile">
      <StatusBar barStyle="dark-content" backgroundColor="#f9fafb" />
      <ScrollView style={styles.scrollView}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()}>
            <Text style={styles.backButtonText}>← Back</Text>
          </TouchableOpacity>
        </View>

        {/* Profile Section */}
        <View style={styles.profileSection}>
          <Image
            source={{
              uri:
                userProfile?.profileImageUrl ||
                `https://via.placeholder.com/100x100/6366f1/ffffff?text=${
                  userProfile?.name?.[0] || 'U'
                }`,
            }}
            style={styles.profileImage}
          />
          <Text style={styles.userName}>{userProfile.name}</Text>
          {!!userProfile?.description && (
            <Text style={styles.userDescription}>{userProfile.description}</Text>
          )}

          <View style={styles.actionButtonContainer}>
            {isFriend ? (
              <TouchableOpacity
                style={styles.removeButton}
                onPress={handleRemoveFriend}
                disabled={isActionLoading}
              >
                <Text style={styles.removeButtonText}>
                  {isActionLoading ? 'Removing...' : 'Remove Friend'}
                </Text>
              </TouchableOpacity>
            ) : hasPendingRequest ? (
              <TouchableOpacity style={styles.pendingButton} disabled>
                <Text style={styles.pendingButtonText}>Request Sent</Text>
              </TouchableOpacity>
            ) : (
              <TouchableOpacity
                style={styles.addButton}
                onPress={handleSendFriendRequest}
                disabled={isActionLoading}
              >
                <Text style={styles.addButtonText}>
                  {isActionLoading ? 'Sending...' : 'Add Friend'}
                </Text>
              </TouchableOpacity>
            )}
          </View>
        </View>

        {/* Tabs */}
        <View style={styles.tabsContainer}>
          {['goals', 'achievements', 'wishlist'].map((tab) => (
            <TouchableOpacity
              key={tab}
              onPress={() => setActiveTab(tab as any)}
              style={[
                styles.tabButton,
                activeTab === tab && styles.tabButtonActive,
              ]}
            >
              <Text
                style={[
                  styles.tabText,
                  activeTab === tab && styles.tabTextActive,
                ]}
              >
                {tab.charAt(0).toUpperCase() + tab.slice(1)}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* CONTENT */}
        <Animated.View
          style={{
            opacity: fadeAnim,
            transform: [
              {
                translateY: fadeAnim.interpolate({
                  inputRange: [0, 1],
                  outputRange: [20, 0],
                }),
              },
            ],
          }}
        >
          {isLoading ? (
            <ActivityIndicator size="large" color="#8b5cf6" style={{ marginTop: 20 }} />
          ) : data.length > 0 ? (
            (data as any[]).map((item) =>
              activeTab === 'wishlist' ? (
                <ExperienceCard key={item.id} experience={item} />
              ) : activeTab === 'goals' ? (
                <GoalCard key={item.id} goal={item} />
              ) : (
                <AchievementCard key={item.id} goal={item} />
              )
            )
          ) : (
            <Text style={styles.emptyStateText}>No {activeTab} yet.</Text>
          )}
        </Animated.View>
      </ScrollView>
    </MainScreen>
  );
};

const styles = StyleSheet.create({
  scrollView: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingTop: Platform.OS === 'ios' ? 50 : 34,
    paddingBottom: 10,
    backgroundColor: '#fff',
    minHeight: Platform.OS === 'ios' ? 70 : 56,
  },
  backButtonText: { fontSize: 16, color: '#8b5cf6' },

  profileSection: { alignItems: 'center', padding: 24, backgroundColor: '#fff' },
  profileImage: { width: 96, height: 96, borderRadius: 48, marginBottom: 12 },
  userName: { fontSize: 22, fontWeight: 'bold', color: '#111827', marginBottom: 8 },
  userDescription: {
    fontSize: 14,
    color: '#6b7280',
    textAlign: 'center',
    marginBottom: 16,
    paddingHorizontal: 8,
  },

  actionButtonContainer: { marginTop: 12, width: '100%', paddingHorizontal: 24 },
  addButton: {
    backgroundColor: '#8b5cf6',
    paddingHorizontal: 24,
    paddingVertical: 10,
    borderRadius: 8,
  },
  addButtonText: { color: '#fff', fontWeight: '600', textAlign: 'center' },
  removeButton: {
    backgroundColor: '#ef4444',
    paddingHorizontal: 24,
    paddingVertical: 10,
    borderRadius: 8,
  },
  removeButtonText: { color: '#fff', fontWeight: '600', textAlign: 'center' },
  pendingButton: {
    backgroundColor: '#f59e0b',
    paddingHorizontal: 24,
    paddingVertical: 10,
    borderRadius: 8,
  },
  pendingButtonText: { color: '#fff', fontWeight: '600', textAlign: 'center' },

  tabsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingVertical: 12,
    backgroundColor: '#f3f4f6',
  },
  tabButton: { paddingVertical: 8, paddingHorizontal: 16, borderRadius: 20 },
  tabButtonActive: { backgroundColor: '#8b5cf6' },
  tabText: { color: '#6b7280', fontWeight: '600' },
  tabTextActive: { color: '#fff' },

  goalCard: {
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 16,
    marginHorizontal: 12,
    marginTop: 12,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  goalTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 10,
  },
  weekBarTrack: {
    width: '100%',
    height: 6,
    backgroundColor: '#e5e7eb',
    borderRadius: 999,
    marginBottom: 8,
  },
  weekBarFill: {
    height: 6,
    backgroundColor: '#7c3aed',
    borderRadius: 999,
  },
  goalDetailText: {
    color: '#374151',
    fontWeight: '500',
    marginTop: 4,
  },

  // ✅ Wishlist card identical to UserProfile
  experienceCard: {
    backgroundColor: '#fff',
    borderRadius: 8,
    marginHorizontal: 12,
    marginTop: 12,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  experienceImage: { width: '100%', height: 120 },
  experienceContent: { padding: 12 },
  experienceTitle: { fontWeight: '600', fontSize: 16, color: '#111827' },
  experienceDescription: { color: '#6b7280', marginVertical: 4, fontSize: 14 },
  experiencePrice: { color: '#8b5cf6', fontWeight: 'bold', fontSize: 16 },

  emptyStateText: {
    textAlign: 'center',
    marginTop: 20,
    color: '#6b7280',
    fontSize: 16,
  },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  loadingText: { color: '#6b7280', marginTop: 8 },
});

export default FriendProfileScreen;
