import { initializeApp, getApps, getApp } from 'firebase/app';
import {
  initializeAuth,
  getAuth,
  getReactNativePersistence,
  browserLocalPersistence,
} from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';
import { getFunctions } from 'firebase/functions';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';
import { firebaseConfig, validateFirebaseConfig } from '../config/firebaseConfig';

// ✅ Validate Firebase configuration
if (!validateFirebaseConfig()) {
  console.error('Firebase configuration is incomplete. Please check your environment variables.');
}

// ✅ Initialize the Firebase app (avoid re-initialization)
const app = getApps().length ? getApp() : initializeApp(firebaseConfig);

// ✅ Initialize Auth depending on the platform
let auth;

if (Platform.OS === 'web') {
  // Web version — uses browser local persistence
  auth = getAuth(app);
  auth.setPersistence(browserLocalPersistence);
} else {
  // Native (Android / iOS) version — uses AsyncStorage
  auth = initializeAuth(app, {
    persistence: getReactNativePersistence(AsyncStorage),
  });
}

// ✅ Initialize other Firebase services
export const db = getFirestore(app);
export const storage = getStorage(app);
export const functions = getFunctions(app, 'us-central1');
export { auth };
export default app;
