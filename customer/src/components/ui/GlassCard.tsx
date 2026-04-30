import { BlurView } from 'expo-blur';
import { ReactNode } from 'react';
import { StyleProp, StyleSheet, View, ViewStyle } from 'react-native';

interface GlassCardProps {
  children: ReactNode;
  elevated?: boolean;
  style?: StyleProp<ViewStyle>;
}

export function GlassCard({ children, elevated = true, style }: GlassCardProps) {
  return (
    <View style={[styles.card, elevated && styles.elevated, style]}>
      <BlurView intensity={45} pointerEvents="none" style={StyleSheet.absoluteFill} tint="light" />
      <View style={styles.content}>{children}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.45)',
    borderRadius: 24,
    backgroundColor: 'rgba(255,255,255,0.55)',
    overflow: 'hidden',
  },
  content: {
    flex: 1,
  },
  elevated: {
    shadowColor: '#101828',
    shadowOffset: { width: 0, height: 18 },
    shadowOpacity: 0.14,
    shadowRadius: 34,
    elevation: 12,
  },
});
