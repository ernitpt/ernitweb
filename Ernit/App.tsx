import React, { useEffect, useState, ReactNode } from 'react';
import { View, Text, StyleSheet, Platform, ActivityIndicator } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import * as Font from 'expo-font';
import { MaterialIcons, Ionicons, FontAwesome } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';

// 💜 Shared gradient colors
const GRADIENT_COLORS = ['#7C3AED', '#9F7AEA'] as const;

// 🧩 Props for the gradient wrapper
interface GradientBackgroundProps {
  children: ReactNode;
}

// ✅ Reusable gradient background (works on both web and native)
const GradientBackground: React.FC<GradientBackgroundProps> = ({ children }) => {
  if (Platform.OS === 'web') {
    return <View style={[styles.container, { backgroundColor: GRADIENT_COLORS[0] }]}>{children}</View>;
  }

  return (
    <LinearGradient colors={GRADIENT_COLORS} style={styles.container} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}>
      {children}
    </LinearGradient>
  );
};

export default function App() {
  const [fontsLoaded, setFontsLoaded] = useState(false);

  // 🔤 Load icon fonts manually for web (Expo Go handles this automatically on native)
  useEffect(() => {
    const loadFonts = async () => {
      try {
        await Font.loadAsync({
          ...MaterialIcons.font,
          ...Ionicons.font,
          ...FontAwesome.font,
        });
      } catch (err) {
        console.error('Font loading error:', err);
      } finally {
        setFontsLoaded(true);
      }
    };
    loadFonts();
  }, []);

  // ⏳ Simple loading screen
  if (!fontsLoaded) {
    return (
      <View style={[styles.container, { backgroundColor: GRADIENT_COLORS[0] }]}>
        <ActivityIndicator size="large" color="#fff" />
        <Text style={[styles.text, { marginTop: 12 }]}>Loading fonts...</Text>
      </View>
    );
  }

  return (
    <GradientBackground>
      <StatusBar style="light" />
      <Text style={styles.text}>Welcome to Ernit 🌍</Text>
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
    fontSize: 22,
    fontWeight: '700',
  },
});
