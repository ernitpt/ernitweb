import React, { useEffect, useState, ReactNode } from 'react';
import { View, Text, StyleSheet, Platform } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import * as Font from 'expo-font';
import { MaterialIcons, Ionicons, FontAwesome } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';

// Define prop type for children
type GradientBackgroundProps = {
  children: ReactNode;
};

export default function App() {
  const [fontsLoaded, setFontsLoaded] = useState(false);

  // ✅ Load icon fonts for web
  useEffect(() => {
    async function loadFonts() {
      await Font.loadAsync({
        ...MaterialIcons.font,
        ...Ionicons.font,
        ...FontAwesome.font,
      });
      setFontsLoaded(true);
    }
    loadFonts();
  }, []);

  if (!fontsLoaded) {
    return (
      <View style={styles.container}>
        <Text>Loading fonts...</Text>
      </View>
    );
  }

  // ✅ Gradient fallback for web
  const GradientBackground: React.FC<GradientBackgroundProps> =
    Platform.OS === 'web'
      ? ({ children }) => (
          <View style={[styles.container, { backgroundColor: '#7C3AED' }]}>
            {children}
          </View>
        )
      : ({ children }) => (
          <LinearGradient
            colors={['#7C3AED', '#9F7AEA']}
            style={styles.container}
          >
            {children}
          </LinearGradient>
        );

  return (
    <GradientBackground>
      <Text style={styles.text}>Welcome to Ernit 🌍</Text>
      <StatusBar style="light" />
    </GradientBackground>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  text: {
    color: '#fff',
    fontSize: 20,
    fontWeight: '600',
  },
});
