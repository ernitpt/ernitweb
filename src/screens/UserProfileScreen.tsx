import { RootStackParamList } from '../types';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Image,
  StatusBar,
  StyleSheet,
  Alert,
  ActivityIndicator,
  Modal,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  Animated,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { useApp } from '../context/AppContext';
import { Goal, UserProfile, Experience, User } from '../types';
import { goalService } from '../services/GoalService';
import { userService } from '../services/userService';
import { experienceGiftService } from '../services/ExperienceGiftService';
import { notificationService } from '../services/NotificationService';
import { DefaultUserIcon } from '../components/DefaultUserIcon';
import MainScreen from './MainScreen';
import { storage } from '../services/firebase';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import PersonAddIcon from '../assets/icons/person_add.svg';
import EditProfileIcon from '../assets/icons/editprofile.svg';

type UserProfileNavigationProp = NativeStackNavigationProp<
  RootStackParamList,
  'Profile'
>;

const UserProfileScreen: React.FC = () => {
  const { state, dispatch } = useApp();
  const [activeTab, setActiveTab] = useState<'goals' | 'achievements' | 'wishlist'>('goals');
  const [loading, setLoading] = useState(true);
  const [completedGoals, setCompletedGoals] = useState<Goal[]>([]);
  const [futureGoals, setFutureGoals] = useState<Goal[]>([]);
  const [activeGoals, setActiveGoals] = useState<Goal[]>([]);
  const [wishlist, setWishlist] = useState<Experience[]>([]);
  const [isEditModalVisible, setIsEditModalVisible] = useState(false);
  const [editFormData, setEditFormData] = useState({
    name: '',
    description: '',
    profileImageUrl: '',
  });
  const [isUpdating, setIsUpdating] = useState(false);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [unreadFriendRequests, setUnreadFriendRequests] = useState(0);
  const navigation = useNavigation<UserProfileNavigationProp>();
  const userId = state.user?.id || 'current_user';
  const fadeAnim = React.useRef(new Animated.Value(1)).current;

  useEffect(() => {
    loadProfileAndGoals();
  }, [userId]);

  useEffect(() => {
    if (userProfile) {
      animateContent();
    }
  }, [activeTab]);

  useEffect(() => {
    if (!userId) return;

    const unsubscribe = notificationService.listenToUserNotifications(userId, (notifications) => {
      const friendRequestNotifications = notifications.filter(
        n => n.type === 'friend_request' && !n.read
      );
      setUnreadFriendRequests(friendRequestNotifications.length);
    });

    return unsubscribe;
  }, [userId]);

  const animateContent = () => {
    fadeAnim.setValue(0);
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 300,
      useNativeDriver: true,
    }).start();
  };

  const loadProfileAndGoals = async () => {
    try {
      setLoading(true);

      const fetchedProfile = await userService.getUserProfile(userId);
      setUserProfile(fetchedProfile);

      const userGoals = await goalService.getUserGoals(userId);

      const active = userGoals.filter(
        (g) => !g.isCompleted && g.currentCount < g.targetCount && (!g.startDate || new Date(g.startDate) <= new Date())
      );
      const completed = userGoals.filter(
        (g) => g.isCompleted || g.currentCount >= g.targetCount
      );
      const future = userGoals.filter(
        (g) => g.startDate && new Date(g.startDate) > new Date()
      );

      setActiveGoals(active);
      setCompletedGoals(completed);
      setFutureGoals(future);

      const userWishlist = await userService.getWishlist(userId);
      setWishlist(userWishlist || []);
    } catch (error) {
      console.error('Error loading profile data:', error);
    } finally {
      setLoading(false);
    }
  };

  const pickImage = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert(
        'Permission denied',
        'Sorry, we need camera roll permissions to upload photos!'
      );
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });

    if (!result.canceled && result.assets[0]) {
      setEditFormData((prev) => ({
        ...prev,
        profileImageUrl: result.assets[0].uri,
      }));
    }
  };

  const openEditModal = () => {
    setEditFormData({
      name: userProfile?.name || state.user?.displayName || '',
      description: userProfile?.description || state.user?.profile?.description || '',
      profileImageUrl: userProfile?.profileImageUrl || '',
    });
    setIsEditModalVisible(true);
  };

  const refreshProfile = async () => {
    try {
      setLoading(true);
      const fetchedProfile = await userService.getUserProfile(userId);
      setUserProfile(fetchedProfile);
    } catch (error) {
      console.error('Error refreshing profile:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSaveProfile = async () => {
    const charCount = editFormData.description.length;
    if (charCount > 300) {
      Alert.alert(
        'Description too long',
        'Please keep your description under 300 characters.'
      );
      return;
    }

    try {
      setIsUpdating(true);

      let profileImageUrlToSave = editFormData.profileImageUrl || '';
      const previousImageUrl = userProfile?.profileImageUrl || '';

      const isLocalUri = (uri: string) =>
        uri.startsWith('file:') || uri.startsWith('content:');

      if (
        profileImageUrlToSave &&
        isLocalUri(profileImageUrlToSave) &&
        profileImageUrlToSave !== previousImageUrl
      ) {
        try {
          const response = await fetch(profileImageUrlToSave);
          const blob = await response.blob();

          const getExt = (uri: string) => {
            const clean = uri.split('?')[0];
            const parts = clean.split('.');
            const ext = parts.length > 1 ? parts.pop() : undefined;
            return (ext || 'jpg').toLowerCase();
          };
          const ext = getExt(profileImageUrlToSave);

          const filePath = `profile-images/${userId}/profile/profile_${Date.now()}.${ext}`;
          const storageRef = ref(storage, filePath);

          await uploadBytes(storageRef, blob);
          const downloadUrl = await getDownloadURL(storageRef);
          profileImageUrlToSave = downloadUrl;
        } catch (uploadErr) {
          console.error('Error uploading profile image:', uploadErr);
          Alert.alert('Upload failed', 'Could not upload the profile image.');
          profileImageUrlToSave = previousImageUrl;
        }
      }

      const profileUpdates = {
        name: editFormData.name.trim() || userProfile?.name || '',
        description: editFormData.description.trim(),
        profileImageUrl: profileImageUrlToSave,
        updatedAt: new Date(),
      };

      const updatedProfile: UserProfile = {
        ...(userProfile as UserProfile),
        ...profileUpdates,
      };

      await userService.updateUserProfile(userId, {
        profile: updatedProfile,
      });

      if (state.user) {
        const updatedUser: User = {
          ...state.user,
          profile: updatedProfile,
        };
        dispatch({ type: 'SET_USER', payload: updatedUser });
      }

      await refreshProfile();

      setIsEditModalVisible(false);
      Alert.alert('Success', 'Profile updated successfully!');
    } catch (error) {
      console.error('Error updating profile:', error);
      Alert.alert('Error', 'Failed to update profile. Please try again.');
    } finally {
      setIsUpdating(false);
    }
  };

  const GoalCard: React.FC<{ goal: Goal }> = ({ goal }) => {
    const navigation = useNavigation<UserProfileNavigationProp>();
    const [experienceGift, setExperienceGift] = useState<any>(null);
    const [empoweredName, setEmpoweredName] = useState<string | null>(null);

    useEffect(() => {
      if (goal.empoweredBy) {
        userService.getUserName(goal.empoweredBy).then(setEmpoweredName);
      }

      let isMounted = true;
      if (goal.isCompleted && goal.experienceGiftId) {
        experienceGiftService
          .getExperienceGiftById(goal.experienceGiftId)
          .then((gift) => {
            if (isMounted) setExperienceGift(gift);
          })
          .catch((err) => console.error('Error fetching experience gift:', err));
      }

      return () => {
        isMounted = false;
      };
    }, [goal.isCompleted, goal.experienceGiftId, goal.empoweredBy]);

    const handlePress = () => {
      if (activeTab === 'achievements' && experienceGift) {
        navigation.navigate('Completion', { goal, experienceGift });
      }
    };

    return (
      <TouchableOpacity
        onPress={activeTab === 'achievements' ? handlePress : undefined}
        activeOpacity={activeTab === 'achievements' ? 0.8 : 1}
        style={styles.goalCard}
      >
        <Text style={styles.goalTitle}>{goal.title}</Text>

        {goal.empoweredBy && (
          <Text style={styles.goalDetailText}>
            ⚡ Empowered by {empoweredName || '—'}
          </Text>
        )}

        {activeTab === 'achievements' && experienceGift && (
          <Text style={[styles.goalDetailText, { marginTop: 6 }]}>
            🎁 Ernit Experience: {experienceGift.experience?.title}
          </Text>
        )}
      </TouchableOpacity>
    );
  };

  const ExperienceCard: React.FC<{ experience: Experience }> = ({ experience }) => {
    const navigation = useNavigation<UserProfileNavigationProp>();

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

  const renderContent = () => {
    if (loading) {
      return (
        <ActivityIndicator size="large" color="#8b5cf6" style={{ marginTop: 20 }} />
      );
    }

    let dataToRender: (Goal | Experience)[] = [];
    if (activeTab === 'goals') {
      dataToRender = activeGoals;
    } else if (activeTab === 'achievements') {
      dataToRender = completedGoals;
    } else {
      dataToRender = wishlist;
    }

    if (dataToRender.length === 0) {
      return (
        <Text style={styles.emptyStateText}>
          No {activeTab} yet.
        </Text>
      );
    }

    return dataToRender.map((item: any) =>
      activeTab === 'wishlist' ? (
        <ExperienceCard key={item.id} experience={item} />
      ) : (
        <GoalCard key={item.id} goal={item} />
      )
    );
  };

  return (
    <MainScreen activeRoute="Profile">
      <StatusBar barStyle="dark-content" backgroundColor="#f9fafb" />
      <ScrollView style={styles.scrollView}>

        {/* Floating Edit Icon */}
        <TouchableOpacity
          onPress={openEditModal}
          activeOpacity={0.6}
          style={styles.editIconButton}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <EditProfileIcon width={25} height={25} />
        </TouchableOpacity>

        {/* Profile Section */}
        <View style={styles.profileSection}>
          {userProfile?.profileImageUrl ? (
            <Image
              source={{ uri: userProfile.profileImageUrl }}
              style={styles.profileImage}
            />
          ) : (
            <View
              style={{
                width: 96,
                height: 96,
                borderRadius: 48,
                marginBottom: 12,
                overflow: 'hidden',
                alignItems: 'center',
                justifyContent: 'center',
                backgroundColor: '#f3f4f7ff',
              }}
            >
              <DefaultUserIcon size={96} />
            </View>
          )}

          <Text style={styles.userName}>
            {userProfile?.name || state.user?.displayName || 'User'}
          </Text>

          {userProfile?.description && (
            <Text style={styles.userDescription}>
              {userProfile.description}
            </Text>
          )}

          {/* FRIEND BUTTONS */}
          <View style={styles.secondaryButtonsContainer}>
            <View style={{ position: 'relative' }}>
            </View>

            <TouchableOpacity
              style={styles.friendsButton}
              onPress={() => navigation.navigate('FriendsList')}
            >
              <Text style={styles.friendsButtonText}>View Friends</Text>
            </TouchableOpacity>
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
          {renderContent()}
        </Animated.View>
      </ScrollView>

      {/* Edit Modal */}
      <Modal
        visible={isEditModalVisible}
        animationType="slide"
        presentationStyle="pageSheet"
      >
        <KeyboardAvoidingView
          style={styles.modalContainer}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        >
          <View style={styles.modalHeader}>
            <TouchableOpacity
              onPress={() => setIsEditModalVisible(false)}
              style={styles.modalCancelButton}
            >
              <Text style={styles.modalCancelText}>Cancel</Text>
            </TouchableOpacity>
            <Text style={styles.modalTitle}>Edit Profile</Text>
            <TouchableOpacity
              onPress={handleSaveProfile}
              disabled={isUpdating}
              style={[
                styles.modalSaveButton,
                isUpdating && styles.disabledButton,
              ]}
            >
              <Text
                style={[
                  styles.modalSaveText,
                  isUpdating && styles.disabledText,
                ]}
              >
                {isUpdating ? 'Saving...' : 'Save'}
              </Text>
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.modalContent}>
            <View style={styles.imageSection}>
              <TouchableOpacity
                onPress={pickImage}
                style={styles.imagePickerButton}
              >
                {userProfile?.profileImageUrl ? (
                  <Image
                    source={{ uri: userProfile.profileImageUrl }}
                    style={styles.profileImage}
                  />
                ) : (
                  <View
                    style={{
                      width: 96,
                      height: 96,
                      borderRadius: 48,
                      marginBottom: 12,
                      overflow: 'hidden',
                      alignItems: 'center',
                      justifyContent: 'center',
                      backgroundColor: '#f3f4f7ff',
                    }}
                  >
                    <DefaultUserIcon size={96} />
                  </View>
                )}
                <View style={styles.imageOverlay}>
                  <Text style={styles.imageOverlayText}>📷</Text>
                </View>
              </TouchableOpacity>
              <Text style={styles.imagePickerLabel}>Tap to change photo</Text>
            </View>

            <View style={styles.inputSection}>
              <Text style={styles.inputLabel}>Name</Text>
              <TextInput
                style={styles.textInput}
                value={editFormData.name}
                onChangeText={(text) =>
                  setEditFormData((prev) => ({ ...prev, name: text }))
                }
                placeholder={state.user?.displayName || 'Enter your name'}
                maxLength={50}
              />
            </View>

            <View style={styles.inputSection}>
              <Text style={styles.inputLabel}>
                About You ({editFormData.description.length || 0}/300 characters)
              </Text>
              <TextInput
                style={[styles.textInput, styles.descriptionInput]}
                value={editFormData.description}
                onChangeText={(text) =>
                  setEditFormData((prev) => ({ ...prev, description: text }))
                }
                placeholder={
                  userProfile?.description || 'Tell us about yourself...'
                }
                multiline
                numberOfLines={6}
                textAlignVertical="top"
                maxLength={300}
              />
              {(editFormData.description.length || 0) > 300 && (
                <Text style={styles.errorText}>
                  Description is too long. Please keep it under 300 characters.
                </Text>
              )}
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      </Modal>
    </MainScreen>
  );
};

const styles = StyleSheet.create({
  scrollView: { flex: 1 },

  editIconButton: {
    position: 'absolute',
    top: 56,
    right: 26,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#fff',
    justifyContent: 'center',
    alignItems: 'center',

    // soft floating shadow (S1)
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.12,
    shadowRadius: 2,
    elevation: 2,
    zIndex: 20,
  },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingTop: Platform.OS === 'ios' ? 50 : 34,
    paddingBottom: 10,
    backgroundColor: '#fff',
    minHeight: Platform.OS === 'ios' ? 70 : 56,
  },

  profileSection: {
    alignItems: 'center',
    padding: 24,
    paddingTop: 48, // slight offset since icon overlaps section
    backgroundColor: '#fff',
  },

  profileImage: {
    width: 96,
    height: 96,
    borderRadius: 48,
    marginBottom: 12,
  },

  userName: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#111827',
    marginBottom: 4,
  },

  /** ✅ LESS spacing under description (as requested) */
  userDescription: {
    fontSize: 14,
    color: '#6b7280',
    textAlign: 'center',
    marginBottom: 8, // was larger, now reduced
    paddingHorizontal: 8,
  },

  /** FRIEND BUTTONS */
  secondaryButtonsContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    columnGap: 0,
    alignItems: 'center',
    marginTop: 6, // tightened up
  },

  notificationBadge: {
    position: 'absolute',
    top: -6,
    right: -6,
    backgroundColor: '#ef4444',
    borderRadius: 10,
    minWidth: 18,
    height: 18,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#ffffff',
  },
  badgeText: {
    color: '#ffffff',
    fontSize: 10,
    fontWeight: 'bold',
  },

  friendsButton: {
    backgroundColor: '#84b3e9ff',
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 6,
  },
  friendsButtonText: {
    color: '#fff',
    fontWeight: '600',
    textAlign: 'center',
  },

  /** Tabs, Cards, Modal, Inputs (unchanged) */

  tabsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingVertical: 12,
    backgroundColor: '#f3f4f6',
  },
  tabButton: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 20,
  },
  tabButtonActive: { backgroundColor: '#8b5cf6' },
  tabText: {
    color: '#6b7280',
    fontWeight: '600',
  },
  tabTextActive: { color: '#fff' },

  goalCard: {
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 16,
    margin: 12,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  goalTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 8,
  },
  goalDetailText: {
    color: '#6b7280',
    fontSize: 14,
  },

  experienceCard: {
    backgroundColor: '#fff',
    borderRadius: 8,
    margin: 12,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  experienceImage: {
    width: '100%',
    height: 120,
  },
  experienceContent: { padding: 12 },
  experienceTitle: {
    fontWeight: '600',
    fontSize: 16,
    color: '#111827',
  },
  experienceDescription: {
    color: '#6b7280',
    marginVertical: 4,
    fontSize: 14,
  },
  experiencePrice: {
    color: '#8b5cf6',
    fontWeight: 'bold',
    fontSize: 16,
  },

  emptyStateText: {
    textAlign: 'center',
    marginTop: 20,
    color: '#6b7280',
    fontSize: 16,
  },

  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    color: '#6b7280',
    marginTop: 8,
  },

  newGoalsSection: {
    paddingHorizontal: 24,
    paddingVertical: 24,
  },
  modalContainer: {
    flex: 1,
    backgroundColor: '#f9fafb',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  modalCancelButton: {
    paddingVertical: 8,
  },
  modalCancelText: {
    fontSize: 16,
    color: '#8b5cf6',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#111827',
  },
  modalSaveButton: {
    paddingVertical: 8,
  },
  modalSaveText: {
    fontSize: 16,
    color: '#8b5cf6',
    fontWeight: '600',
  },
  disabledButton: {
    opacity: 0.5,
  },
  disabledText: {
    color: '#9ca3af',
  },
  modalContent: {
    flex: 1,
    padding: 20,
  },

  imageSection: {
    alignItems: 'center',
    marginBottom: 32,
  },
  imagePickerButton: {
    position: 'relative',
    marginBottom: 12,
  },
  imageOverlay: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    backgroundColor: '#8b5cf6',
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
    borderColor: '#ffffff',
  },
  imageOverlayText: {
    fontSize: 16,
  },
  imagePickerLabel: {
    fontSize: 14,
    color: '#6b7280',
  },

  inputSection: {
    marginBottom: 24,
  },
  inputLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 8,
  },
  textInput: {
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
    color: '#111827',
  },
  descriptionInput: {
    height: 120,
    textAlignVertical: 'top',
  },
  errorText: {
    color: '#ef4444',
    fontSize: 14,
    marginTop: 4,
  },
});

export default UserProfileScreen;
