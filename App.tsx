import React from 'react';
import { AppProvider } from './src/context/AppContext';
import AppNavigator from './src/navigation/AppNavigator';
import { Ionicons } from '@expo/vector-icons';
import * as Font from 'expo-font';
import { useEffect } from 'react';

export default function App() {
  useEffect(() => {
    // Load Ionicons font on web
    Font.loadAsync(Ionicons.font);
  }, []);

  return (  
      <AppProvider>
        <AppNavigator />
      </AppProvider>
  );
}


