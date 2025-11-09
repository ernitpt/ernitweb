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
  Platform,
} from 'react-native';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { ChevronLeft, UserPlus, UserMinus, Clock } from 'lucide-react-native';
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
  const [userName, setUserName] = useState<string | null>(null);
  const [activeTab, setActiveTab] =
    useState<'goals' | 'achievements' | 'wishlist'>('goals');
  const [activeGoals, setActiveGoals] = useState<Goal[]>([]);
  const [completedGoals, setCompletedGoals] = useState<Goal[]>([]);
  const [wishlist, setWishlist] = useState<Experience[]>([]);
  const [isFriend, setIsFriend] = useState(false);
  const [hasPendingRequest, setHasPendingRequest] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isActionLoading, setIsActionLoading] = useState(false);
  const [imageLoadError, setImageLoadError] = useState(false);

  // Popup animation states
  const [showRemovePopup, setShowRemovePopup] = useState(false);
  const removeAnim = useRef(new Animated.Value(0)).current;
  const removeScale = useRef(new Animated.Value(0.9)).current;

  const fadeAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    loadFriendProfile();
  }, [userId]);

  useEffect(() => {
    if (userProfile) animateContent();
  }, [activeTab]);

  const animateContent = () => {
    fadeAnim.setValue(0);
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 300,
      useNativeDriver: true,
    }).start();
  };

  const openRemovePopup = () => {
    setShowRemovePopup(true);
    Animated.parallel([
      Animated.timing(removeAnim, { toValue: 1, duration: 200, useNativeDriver: true }),
      Animated.spring(removeScale, { toValue: 1, friction: 5, useNativeDriver: true }),
    ]).start();
  };

  const closeRemovePopup = () => {
    Animated.parallel([
      Animated.timing(removeAnim, { toValue: 0, duration: 150, useNativeDriver: true }),
      Animated.timing(removeScale, { toValue: 0.9, duration: 150, useNativeDriver: true }),
    ]).start(() => setShowRemovePopup(false));
  };

  const loadFriendProfile = async () => {
    try {
      setIsLoading(true);
      setImageLoadError(false);

      const profile = await userService.getUserProfile(userId);
      const name = await userService.getUserName(userId);
      setUserProfile(profile);
      setUserName(name);

      const [allGoals, wishlistData] = await Promise.all([
        goalService.getUserGoals(userId),
        userService.getWishlist(userId),
      ]);

      setActiveGoals(allGoals.filter((g) => !g.isCompleted));
      setCompletedGoals(allGoals.filter((g) => g.isCompleted));
      setWishlist(wishlistData || []);

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

  const handleSendFriendRequest = async () => {
    if (!currentUserId || !userProfile) {
      console.log('no profile');
      return;
    }

    try {
      setIsActionLoading(true);
      await friendService.sendFriendRequest(
        currentUserId,
        currentUserName,
        userId,
        userProfile.name,
        state.user?.profile?.country,
        currentUserProfileImageUrl
      );
      setHasPendingRequest(true);
      Alert.alert('Success', `Friend request sent to ${userProfile.name}!`);
    } catch (error) {
      console.error('Error sending friend request:', error);
      Alert.alert('Error', 'Failed to send friend request.');
    } finally {
      setIsActionLoading(false);
    }
  };

  const handleRemoveFriend = () => {
    openRemovePopup();
  };

  const confirmRemoveFriend = async () => {
    if (!currentUserId || !userProfile) return;
    try {
      setIsActionLoading(true);
      await friendService.removeFriend(currentUserId, userId);
      setIsFriend(false);
      closeRemovePopup();
    } catch (error) {
      console.error('Error removing friend:', error);
      closeRemovePopup();
    } finally {
      setIsActionLoading(false);
    }
  };

  const GoalCard = ({ goal }: { goal: Goal }) => {
    const [giverName, setGiverName] = useState<string | null>(null);

    useEffect(() => {
      if (goal.empoweredBy)
        userService.getUserName(goal.empoweredBy).then(setGiverName);
    }, [goal.empoweredBy]);

    const weekPct = goalService.getWeeklyProgress(goal);

    return (
      <View style={styles.goalCard}>
        <Text style={styles.goalTitle}>{goal.title}</Text>
        {giverName && <Text style={styles.goalMeta}>⚡ Empowered by {giverName}</Text>}
        {activeTab === 'goals' && (
          <>
            <View style={styles.progressBar}>
              <View style={[styles.progressFill, { width: `${weekPct}%` }]} />
            </View>
            <Text style={styles.goalMeta}>
              This week: {goal.weeklyCount}/{goal.sessionsPerWeek}
            </Text>
          </>
        )}
      </View>
    );
  };

  const ExperienceCard = ({ experience }: { experience: Experience }) => {
    const handlePress = () =>
      navigation.navigate('ExperienceDetails', { experience });
    const experienceImage = Array.isArray(experience.imageUrl)
      ? experience.imageUrl[0]
      : experience.imageUrl;

    return (
      <TouchableOpacity
        activeOpacity={0.8}
        style={styles.experienceCard}
        onPress={handlePress}
      >
        <Image
          source={{ uri: experienceImage }}
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
            €{Number(experience.price || 0).toFixed(2)}
          </Text>
        </View>
      </TouchableOpacity>
    );
  };

  const renderData = () => {
    if (isLoading)
      return (
        <ActivityIndicator size="large" color="#8b5cf6" style={{ marginTop: 20 }} />
      );

    const data =
      activeTab === 'goals'
        ? activeGoals
        : activeTab === 'achievements'
        ? completedGoals
        : wishlist;

    if (data.length === 0)
      return <Text style={styles.emptyStateText}>No {activeTab} yet.</Text>;

    return data.map((item: any) =>
      activeTab === 'wishlist' ? (
        <ExperienceCard key={item.id} experience={item} />
      ) : (
        <GoalCard key={item.id} goal={item} />
      )
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
      <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity
            onPress={() => navigation.goBack()}
            style={styles.backButton}
          >
            <ChevronLeft color="#111827" size={24} />
          </TouchableOpacity>
          <View style={{ width: 40 }} />
        </View>

        {/* Hero Section */}
        <View style={styles.heroSection}>
          {userProfile?.profileImageUrl && !imageLoadError ? (
            <Image
              source={{ uri: userProfile.profileImageUrl }}
              style={styles.profileImage}
              onError={() => setImageLoadError(true)}
            />
          ) : (
            <View style={styles.placeholderImage}>
              <Text style={styles.placeholderText}>
                {userName?.[0]?.toUpperCase() || 'U'}
              </Text>
            </View>
          )}

          <Text style={styles.userName}>{userName}</Text>
          {userProfile?.description && (
            <Text style={styles.userDescription}>{userProfile.description}</Text>
          )}

          {/* Stats */}
          <View style={styles.statsRow}>
            <View style={styles.statItem}>
              <Text style={styles.statNumber}>{activeGoals.length}</Text>
              <Text style={styles.statLabel}>Active</Text>
            </View>
            <View style={styles.statItem}>
              <Text style={styles.statNumber}>{completedGoals.length}</Text>
              <Text style={styles.statLabel}>Completed</Text>
            </View>
            <View style={styles.statItem}>
              <Text style={styles.statNumber}>{wishlist.length}</Text>
              <Text style={styles.statLabel}>Wishlist</Text>
            </View>
          </View>

          {/* Friend Buttons */}
          <View style={styles.friendButtonContainer}>
            {isFriend ? (
              <TouchableOpacity
                style={[styles.friendButton, { backgroundColor: '#f8d6d6ff' }]}
                onPress={handleRemoveFriend}
                disabled={isActionLoading}
              >
                <UserMinus color="#9e2c2cff" size={16} />
                <Text style={[styles.friendButtonText, { color: '#9e2c2cff' }]}>
                  {isActionLoading ? 'Removing...' : 'Remove'}
                </Text>
              </TouchableOpacity>
            ) : hasPendingRequest ? (
              <View style={[styles.friendButton, { backgroundColor: '#f59e0b' }]}>
                <Clock color="#fff" size={16} />
                <Text style={styles.friendButtonText}>Sent</Text>
              </View>
            ) : (
              <TouchableOpacity
                style={[styles.friendButton, { backgroundColor: '#8b5cf6' }]}
                onPress={handleSendFriendRequest}
                disabled={isActionLoading}
              >
                <UserPlus color="#fff" size={16} />
                <Text style={styles.friendButtonText}>
                  {isActionLoading ? 'Sending...' : 'Add'}
                </Text>
              </TouchableOpacity>
            )}
          </View>
        </View>

        {/* Tabs */}
        <View style={styles.tabsContainer}>
          {[
            { key: 'goals', label: 'Goals' },
            { key: 'achievements', label: 'Achievements' },
            { key: 'wishlist', label: 'Wishlist' },
          ].map((tab) => (
            <TouchableOpacity
              key={tab.key}
              onPress={() => setActiveTab(tab.key as any)}
              style={[
                styles.tabButton,
                activeTab === tab.key && styles.tabButtonActive,
              ]}
            >
              <Text
                style={[
                  styles.tabText,
                  activeTab === tab.key && styles.tabTextActive,
                ]}
              >
                {tab.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Content */}
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
          {renderData()}
        </Animated.View>

        <View style={{ height: 80 }} />
      </ScrollView>

      {/* 💬 Remove confirmation popup */}
      {showRemovePopup && (
        <Animated.View
          style={[
            styles.modalOverlay,
            { opacity: removeAnim, transform: [{ scale: removeScale }] },
          ]}
        >
          <View style={styles.modalBox}>
            <Text style={styles.modalTitle}>Remove Friend?</Text>
            <Text style={styles.modalSubtitle}>
              Are you sure you want to remove {userProfile?.name || 'this user'} from your friends list?
            </Text>

            <View style={styles.modalButtons}>
              <TouchableOpacity
                onPress={closeRemovePopup}
                style={[styles.modalButton, styles.cancelButtonPopup]}
                activeOpacity={0.8}
              >
                <Text style={styles.cancelText}>Cancel</Text>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={confirmRemoveFriend}
                style={[styles.modalButton, styles.confirmButton]}
                activeOpacity={0.8}
              >
                <Text style={styles.confirmText}>Yes, remove</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Animated.View>
      )}
    </MainScreen>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f9fafb' },
  header: {
    position: 'absolute',
    top: Platform.OS === 'ios' ? 50 : 40,
    left: 20,
    right: 20,
    zIndex: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(0,0,0,0.1)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  heroSection: {
    backgroundColor: '#fff',
    paddingTop: Platform.OS === 'ios' ? 60 : 50,
    paddingBottom: 32,
    paddingHorizontal: 24,
    alignItems: 'center',
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
  },
  profileImage: {
    width: 100,
    height: 100,
    borderRadius: 50,
    borderWidth: 4,
    borderColor: '#f3f4f6',
  },
  placeholderImage: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: '#8b5cf6',
    justifyContent: 'center',
    alignItems: 'center',
  },
  placeholderText: { fontSize: 40, fontWeight: '700', color: '#fff' },
  userName: {
    fontSize: 24,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 4,
    marginTop: 14,
  },
  userDescription: {
    fontSize: 15,
    color: '#6b7280',
    textAlign: 'center',
    marginBottom: 24,
    paddingHorizontal: 16,
    lineHeight: 22,
  },
  statsRow: { flexDirection: 'row', gap: 32, marginBottom: 20 },
  statItem: { alignItems: 'center' },
  statNumber: { fontSize: 24, fontWeight: '700', color: '#8b5cf6', marginBottom: 4 },
  statLabel: { fontSize: 13, color: '#6b7280', fontWeight: '500' },
  friendButtonContainer: { flexDirection: 'row', justifyContent: 'center' },
  friendButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 18,
    paddingVertical: 8,
    borderRadius: 10,
  },
  friendButtonText: { color: '#fff', fontSize: 14, fontWeight: '600' },
  tabsContainer: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    paddingVertical: 16,
    gap: 8,
  },
  tabButton: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 12,
    backgroundColor: '#fff',
    alignItems: 'center',
  },
  tabButtonActive: { backgroundColor: '#8b5cf6' },
  tabText: { fontSize: 14, fontWeight: '600', color: '#6b7280' },
  tabTextActive: { color: '#fff' },
  goalCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 20,
    marginHorizontal: 20,
    marginTop: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
  },
  goalTitle: { fontSize: 18, fontWeight: '700', color: '#111827', marginBottom: 8 },
  goalMeta: { fontSize: 14, color: '#6b7280', marginTop: 4 },
  progressBar: {
    width: '100%',
    height: 6,
    backgroundColor: '#e5e7eb',
    borderRadius: 999,
    marginTop: 12,
    marginBottom: 8,
  },
  progressFill: { height: 6, backgroundColor: '#8b5cf6', borderRadius: 999 },
  experienceCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    marginHorizontal: 20,
    marginTop: 12,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
  },
  experienceImage: { width: '100%', height: 140, backgroundColor: '#e5e7eb' },
  experienceContent: { padding: 16 },
  experienceTitle: { fontSize: 17, fontWeight: '700', color: '#111827', marginBottom: 4 },
  experienceDescription: {
    fontSize: 14,
    color: '#6b7280',
    lineHeight: 20,
    marginBottom: 8,
  },
  experiencePrice: { fontSize: 18, fontWeight: '700', color: '#8b5cf6' },
  emptyStateText: {
    textAlign: 'center',
    marginTop: 40,
    color: '#9ca3af',
    fontSize: 16,
  },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  loadingText: { marginTop: 12, fontSize: 16, color: '#6b7280' },
  errorContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  errorText: { fontSize: 18, color: '#ef4444', marginBottom: 16 },
  retryButton: {
    paddingHorizontal: 24,
    paddingVertical: 12,
    backgroundColor: '#8b5cf6',
    borderRadius: 8,
  },
  retryButtonText: { color: '#fff', fontSize: 16, fontWeight: '600' },
  modalOverlay: {
    position: 'absolute',
    top: 0, left: 0, right: 0, bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
    backgroundColor: 'rgba(0,0,0,0.45)',
    zIndex: 999,
  },
  modalBox: {
    backgroundColor: '#fff',
    borderRadius: 20,
    width: '85%',
    maxWidth: 360,
    paddingVertical: 24,
    paddingHorizontal: 20,
    shadowColor: '#000',
    shadowOpacity: 0.5,
    shadowRadius: 12,
    elevation: 38,
    alignItems: 'center',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#4c1d95',
    marginBottom: 8,
  },
  modalSubtitle: {
    fontSize: 15,
    color: '#374151',
    textAlign: 'center',
    marginBottom: 20,
  },
  modalButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
    gap: 10,
  },
  modalButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: 'center',
  },
  cancelButtonPopup: {
    backgroundColor: '#f3f4f6',
  },
  confirmButton: {
    backgroundColor: '#7c3aed',
  },
  cancelText: {
    color: '#374151',
    fontWeight: '600',
    fontSize: 15,
  },
  confirmText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 15,
  },
});

export default FriendProfileScreen;
