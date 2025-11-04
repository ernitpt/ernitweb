import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Image,
  StyleSheet,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { Notification } from '../types';
import { friendService } from '../services/FriendService';
import { notificationService } from '../services/NotificationService';

interface FriendRequestNotificationProps {
  notification: Notification;
  onRequestHandled: () => void;
}

const FriendRequestNotification: React.FC<FriendRequestNotificationProps> = ({
  notification,
  onRequestHandled,
}) => {
  const [isHandling, setIsHandling] = useState(false);

  const handleAccept = async () => {
    if (!notification.data?.friendRequestId) return;

    try {
      setIsHandling(true);
      await friendService.acceptFriendRequest(notification.data.friendRequestId);
      
      // Delete the notification after successful handling
      if (notification.id) {
        await notificationService.deleteNotification(notification.id);
      }
      
      Alert.alert('Success', `You are now friends with ${notification.data.senderName}!`);
      onRequestHandled();
    } catch (error) {
      console.error('Error accepting friend request:', error);
      Alert.alert('Error', 'Failed to accept friend request. Please try again.');
    } finally {
      setIsHandling(false);
    }
  };

  const handleDecline = async () => {
    if (!notification.data?.friendRequestId) return;

    try {
      setIsHandling(true);
      await friendService.declineFriendRequest(notification.data.friendRequestId);
      
      // Delete the notification after successful handling
      if (notification.id) {
        await notificationService.deleteNotification(notification.id);
      }
      
      Alert.alert('Request Declined', `Friend request from ${notification.data.senderName} has been declined.`);
      onRequestHandled();
    } catch (error) {
      console.error('Error declining friend request:', error);
      Alert.alert('Error', 'Failed to decline friend request. Please try again.');
    } finally {
      setIsHandling(false);
    }
  };

  const handleClear = async () => {
    try {
      setIsHandling(true);
      
      // Simply delete the notification without handling the request
      if (notification.id) {
        await notificationService.deleteNotification(notification.id);
      }
      
      Alert.alert('Cleared', 'Notification has been cleared.');
      onRequestHandled();
    } catch (error) {
      console.error('Error clearing notification:', error);
      Alert.alert('Error', 'Failed to clear notification. Please try again.');
    } finally {
      setIsHandling(false);
    }
  };

  const senderName = notification.data?.senderName || 'Unknown User';
  const senderCountry = notification.data?.senderCountry || '';
  const senderProfileImageUrl = notification.data?.senderProfileImageUrl;

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View style={styles.userInfo}>
        <Image
          source={{
            uri: senderProfileImageUrl || `https://via.placeholder.com/40x40/6366f1/ffffff?text=${senderName[0]}`,
          }}
          style={styles.profileImage}
          defaultSource={{ uri: `https://via.placeholder.com/40x40/6366f1/ffffff?text=${senderName[0]}` }}
        />
          <View style={styles.userDetails}>
            <Text style={styles.userName}>{senderName}</Text>
            {senderCountry && (
              <Text style={styles.userCountry}>{senderCountry}</Text>
            )}
          </View>
        </View>
        <Text style={styles.timestamp}>
          {new Date(notification.createdAt).toLocaleDateString()}
        </Text>
      </View>

      <View style={styles.messageContainer}>
        <Text style={styles.message}>{notification.message}</Text>
      </View>

      <View style={styles.actionButtons}>
        <TouchableOpacity
          style={[styles.button, styles.declineButton]}
          onPress={handleDecline}
          disabled={isHandling}
        >
          {isHandling ? (
            <ActivityIndicator size="small" color="#ffffff" />
          ) : (
            <Text style={styles.declineButtonText}>Decline</Text>
          )}
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.button, styles.acceptButton]}
          onPress={handleAccept}
          disabled={isHandling}
        >
          {isHandling ? (
            <ActivityIndicator size="small" color="#ffffff" />
          ) : (
            <Text style={styles.acceptButtonText}>Accept</Text>
          )}
        </TouchableOpacity>
      </View>

      <View style={styles.clearButtonContainer}>
        <TouchableOpacity
          style={styles.clearButton}
          onPress={handleClear}
          disabled={isHandling}
        >
          <Text style={styles.clearButtonText}>Clear</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    borderLeftWidth: 4,
    borderLeftColor: '#8b5cf6',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  userInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  profileImage: {
    width: 40,
    height: 40,
    borderRadius: 20,
    marginRight: 12,
  },
  userDetails: {
    flex: 1,
  },
  userName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 2,
  },
  userCountry: {
    fontSize: 14,
    color: '#6b7280',
  },
  timestamp: {
    fontSize: 12,
    color: '#9ca3af',
  },
  messageContainer: {
    marginBottom: 16,
  },
  message: {
    fontSize: 14,
    color: '#374151',
    lineHeight: 20,
  },
  actionButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  button: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 44,
  },
  acceptButton: {
    backgroundColor: '#10b981',
  },
  acceptButtonText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '600',
  },
  declineButton: {
    backgroundColor: '#ef4444',
  },
  declineButtonText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '600',
  },
  clearButtonContainer: {
    marginTop: 12,
    alignItems: 'center',
  },
  clearButton: {
    backgroundColor: '#6b7280',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 6,
  },
  clearButtonText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '500',
  },
});

export default FriendRequestNotification;
