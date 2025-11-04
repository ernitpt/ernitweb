import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  Image,
  StyleSheet,
  ActivityIndicator,
  StatusBar,
  Alert,
  RefreshControl,
} from 'react-native';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList, Friend } from '../types';
import { friendService } from '../services/FriendService';
import { userService } from '../services/userService';
import { useApp } from '../context/AppContext';
import MainScreen from './MainScreen';
import PersonAddIcon from '../assets/icons/person_add.svg';
import { LinearGradient } from 'expo-linear-gradient';

type FriendsListNavigationProp = NativeStackNavigationProp<RootStackParamList, 'FriendsList'>;

interface EnrichedFriend extends Friend {
  currentName?: string;
  currentProfileImageUrl?: string;
}

const FriendsListScreen: React.FC = () => {
  const navigation = useNavigation<FriendsListNavigationProp>();
  const { state } = useApp();
  const [friends, setFriends] = useState<EnrichedFriend[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [removingFriendId, setRemovingFriendId] = useState<string | null>(null);

  const currentUserId = state.user?.id;
  const headerColors = ['#462088ff', '#235c9eff'] as const;

  useFocusEffect(
    React.useCallback(() => {
      loadFriends();
    }, [currentUserId])
  );

  const loadFriends = async () => {
    if (!currentUserId) return;

    try {
      setIsLoading(true);
      const friendsList = await friendService.getFriends(currentUserId);

      const enrichedFriends = await Promise.all(
        friendsList.map(async (friend) => {
          try {
            const profile = await userService.getUserProfile(friend.friendId);
            return {
              ...friend,
              currentName: profile?.name || friend.friendName,
              currentProfileImageUrl: profile?.profileImageUrl || friend.friendProfileImageUrl,
            };
          } catch {
            return {
              ...friend,
              currentName: friend.friendName,
              currentProfileImageUrl: friend.friendProfileImageUrl,
            };
          }
        })
      );

      setFriends(enrichedFriends);
    } catch {
      Alert.alert('Error', 'Failed to load friends. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadFriends();
    setRefreshing(false);
  };

  const handleFriendPress = (friendId: string) => {
    navigation.navigate('FriendProfile', { userId: friendId });
  };

  const handleRemoveFriend = (friend: EnrichedFriend) => {
    Alert.alert(
      'Remove Friend',
      `Are you sure you want to remove ${friend.currentName || friend.friendName}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: async () => {
            if (!currentUserId) return;
            try {
              setRemovingFriendId(friend.friendId);
              await friendService.removeFriend(currentUserId, friend.friendId);
              await loadFriends();
              Alert.alert('Removed', `${friend.currentName || friend.friendName} was removed from your friends.`);
            } catch {
              Alert.alert('Error', 'Failed to remove friend. Please try again.');
            } finally {
              setRemovingFriendId(null);
            }
          },
        },
      ]
    );
  };

  const renderFriendItem = ({ item }: { item: EnrichedFriend }) => {
    const displayName = item.currentName || item.friendName;
    const displayImage = item.currentProfileImageUrl || item.friendProfileImageUrl;
    const isRemoving = removingFriendId === item.friendId;

    return (
      <View style={styles.friendItem}>
        <TouchableOpacity
          style={styles.friendTouchable}
          onPress={() => handleFriendPress(item.friendId)}
          activeOpacity={0.7}
          disabled={isRemoving}
        >
          <Image
            source={{
              uri: displayImage || `https://via.placeholder.com/50x50/6366f1/ffffff?text=${displayName[0]}`,
            }}
            style={styles.profileImage}
          />
          <View style={styles.friendInfo}>
            <Text style={styles.friendName}>{displayName}</Text>
            <Text style={styles.friendDate}>
              Friends since {new Date(item.createdAt).toLocaleDateString()}
            </Text>
          </View>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.removeButton, isRemoving && styles.removeButtonDisabled]}
          onPress={() => handleRemoveFriend(item)}
          disabled={isRemoving}
        >
          {isRemoving ? (
            <ActivityIndicator size="small" color="#ef4444" />
          ) : (
            <Text style={styles.removeButtonText}>Remove</Text>
          )}
        </TouchableOpacity>
      </View>
    );
  };

  return (
    <MainScreen activeRoute="Profile">
      <LinearGradient colors={headerColors} style={styles.gradientHeader}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Your Friends</Text>
        </View>
      </LinearGradient>

      {isLoading && !refreshing ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#8b5cf6" />
          <Text style={styles.loadingText}>Loading friends...</Text>
        </View>
      ) : friends.length > 0 ? (
        <>
          {/* ✅ Count + Add Friend Button */}
          <View style={styles.countContainer}>
            <Text style={styles.countText}>
              {friends.length} {friends.length === 1 ? 'Friend' : 'Friends'}
            </Text>

            <TouchableOpacity
              onPress={() => navigation.navigate('AddFriend')}
              style={styles.addFriendIconButton}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              activeOpacity={0.7}
            >
              <PersonAddIcon width={30} height={30} />
            </TouchableOpacity>
          </View>

          <FlatList
            data={friends}
            renderItem={renderFriendItem}
            keyExtractor={(item) => item.id}
            contentContainerStyle={styles.friendsList}
            showsVerticalScrollIndicator={false}
            refreshControl={
              <RefreshControl
                refreshing={refreshing}
                onRefresh={handleRefresh}
                colors={['#8b5cf6']}
                tintColor="#8b5cf6"
              />
            }
          />
        </>
      ) : (
        <View style={styles.emptyState}>
          <Text style={styles.emptyStateIcon}>👥</Text>
          <Text style={styles.emptyStateTitle}>No Friends Yet</Text>
          <Text style={styles.emptyStateText}>
            Start building your network by adding friends!
          </Text>
          <TouchableOpacity
            style={styles.emptyStateButton}
            onPress={() => navigation.navigate('AddFriend')}
          >
            <Text style={styles.emptyStateButtonText}>Add Your First Friend</Text>
          </TouchableOpacity>
        </View>
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
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 26,
    fontWeight: 'bold',
    color: '#ffffff',
    marginBottom: 4,
  },

  /** ✅ Count row with icon aligned right */
  countContainer: {
    paddingHorizontal: 24,
    paddingVertical: 12,
    backgroundColor: '#f9fafb',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  countText: {
    fontSize: 14,
    color: '#6b7280',
    fontWeight: '500',
  },
  addFriendIconButton: {
    padding: 4,
    justifyContent: 'center',
    alignItems: 'center',
  },

  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#6b7280',
  },

  friendsList: {
    padding: 10,
  },
  friendItem: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 12,
    marginBottom: 12,
    flexDirection: 'row',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
    borderWidth: 1,
    borderColor: '#f3f4f6',
  },
  friendTouchable: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },
  profileImage: {
    width: 56,
    height: 56,
    borderRadius: 28,
    marginRight: 12,
    backgroundColor: '#e5e7eb',
  },
  friendInfo: {
    flex: 1,
  },
  friendName: {
    fontSize: 17,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 4,
  },
  friendDate: {
    fontSize: 13,
    color: '#9ca3af',
  },
  removeButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#ef4444',
    marginLeft: 8,
  },
  removeButtonDisabled: {
    opacity: 0.5,
  },
  removeButtonText: {
    fontSize: 13,
    color: '#ef4444',
    fontWeight: '600',
  },

  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
  },
  emptyStateIcon: {
    fontSize: 64,
    marginBottom: 16,
  },
  emptyStateTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#111827',
    marginBottom: 12,
  },
  emptyStateText: {
    fontSize: 16,
    color: '#6b7280',
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 32,
  },
  emptyStateButton: {
    backgroundColor: '#8b5cf6',
    paddingHorizontal: 32,
    paddingVertical: 16,
    borderRadius: 12,
    shadowColor: '#8b5cf6',
    shadowOpacity: 0.3,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 4,
  },
  emptyStateButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
  },
});

export default FriendsListScreen;
