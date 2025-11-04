// components/HintPopup.tsx
import React, { useEffect, useRef } from 'react';
import { View, Text, Modal, Animated, Pressable, StyleSheet } from 'react-native';
import ConfettiCannon from 'react-native-confetti-cannon';

interface Props {
  visible: boolean;
  hint: string;
  sessionNumber: number;
  totalSessions: number;
  onClose: () => void;
}

const HintPopup: React.FC<Props> = ({ visible, hint, sessionNumber, totalSessions, onClose }) => {
  const scale = useRef(new Animated.Value(0.8)).current;
  const opacity = useRef(new Animated.Value(0)).current;
  const confettiRef = useRef<any>(null);

  useEffect(() => {
    if (visible) {
      Animated.parallel([
        Animated.timing(opacity, { toValue: 1, duration: 220, useNativeDriver: true }),
        Animated.spring(scale, { toValue: 1, friction: 6, tension: 90, useNativeDriver: true }),
      ]).start();

      setTimeout(() => confettiRef.current?.start(), 150);
    } else {
      opacity.setValue(0);
      scale.setValue(0.8);
    }
  }, [visible]);

  return (
    <Modal visible={visible} transparent animationType="none" onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <Animated.View style={[styles.card, { opacity, transform: [{ scale }] }]}>
          <Text style={[styles.h1, { textAlign: 'center' }]}> Your hint</Text>
          <Text style={styles.hint}>{hint}</Text>

        <Pressable style={[styles.btn, { width: 140, alignSelf: 'center' }]} onPress={onClose}>
          <Text style={styles.btnText}>Close</Text>
        </Pressable>

          <ConfettiCannon
            ref={confettiRef}
            autoStart={false}
            count={80}
            explosionSpeed={420}
            fallSpeed={2600}
            origin={{ x: 150, y: -10 }}
            fadeOut
          />
        </Animated.View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(17, 24, 39, 0.55)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  card: {
    width: '100%',
    borderRadius: 16,
    padding: 18,
    backgroundColor: '#ffffff',
    shadowColor: '#000',
    shadowOpacity: 0.15,
    shadowRadius: 10,
    elevation: 6,
  },
  h1: { fontSize: 18, fontWeight: '800', color: '#111827', marginBottom: 8 },
  hint: { fontSize: 16, color: '#111827', marginBottom: 14 },
  btn: { backgroundColor: '#7c3aed', borderRadius: 12, paddingVertical: 12, alignItems: 'center' },
  btnText: { color: '#fff', fontWeight: '700', fontSize: 16 },
});

export default HintPopup;
