import React, { useState } from 'react';
import { View, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import FooterNavigation from '../components/FooterNavigation';
import SideMenu from '../components/SideMenu';

type MainScreenProps = {
  children: React.ReactNode;
  activeRoute: 'Home' | 'Goals' | 'Profile' | 'Notification' | 'Settings';
};

/**
 * Main layout wrapper for all screens.
 * - Keeps content full height
 * - Avoids double top padding
 * - Keeps bottom safe area for footer
 */
const MainScreen: React.FC<MainScreenProps> = ({ children, activeRoute }) => {
  const [sideMenuVisible, setSideMenuVisible] = useState(false);

  const handleMenuPress = () => setSideMenuVisible(true);
  const handleCloseSideMenu = () => setSideMenuVisible(false);

  return (
    <SafeAreaView edges={['bottom']} style={styles.container}>
      {/* Main Content */}
      <View style={styles.content}>{children}</View>

      {/* Footer Navigation */}
      <FooterNavigation activeRoute={activeRoute} onMenuPress={handleMenuPress} />

      {/* Side Menu */}
      <SideMenu visible={sideMenuVisible} onClose={handleCloseSideMenu} />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f9fafb', // consistent app background
  },
  content: {
    flex: 1,
  },
});

export default MainScreen;
