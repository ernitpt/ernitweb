import { firebaseConfig } from '../config/firebaseConfig';
import { initializeApp, getApps, getApp } from 'firebase/app';
import {
  getAuth,
  setPersistence,
  browserLocalPersistence,
  initializeAuth,
} from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { getFunctions } from 'firebase/functions';


// ✅ Prevent re-init on hot reload
const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();

// ✅ Initialize Auth with correct persistence
let auth;

if (typeof window !== 'undefined') {
  // 🌐 Web
  auth = getAuth(app);
  setPersistence(auth, browserLocalPersistence);
} else {
  // 📱 React Native (iOS/Android)
  const { getReactNativePersistence } = require('firebase/auth'); // ✅ no /react-native needed
  auth = initializeAuth(app, {
    persistence: getReactNativePersistence(AsyncStorage),
  });
}

const db = getFirestore(app);
const storage = getStorage(app);
export const functions = getFunctions(app, 'us-central1');

export { app, auth, db, storage };
