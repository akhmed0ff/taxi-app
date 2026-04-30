import { BlurView } from 'expo-blur';
import { ReactNode } from 'react';
import { Pressable, StyleProp, StyleSheet, Text, View, ViewStyle } from 'react-native';

interface QuickPlaceButtonProps {
  icon?: ReactNode;
  label: string;
  onPress?: () => void;
  style?: StyleProp<ViewStyle>;
}

export function QuickPlaceButton({
  icon,
  label,
  onPress,
  style,
}: QuickPlaceButtonProps) {
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => [styles.button, pressed && styles.pressed, style]}
    >
      <BlurView intensity={40} pointerEvents="none" style={StyleSheet.absoluteFill} tint="light" />
      <View style={styles.content}>
        {icon ? <View style={styles.icon}>{icon}</View> : null}
        <Text numberOfLines={1} style={styles.label}>
          {label}
        </Text>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    minHeight: 48,
    maxWidth: 180,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 9,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.45)',
    borderRadius: 24,
    backgroundColor: 'rgba(255,255,255,0.55)',
    overflow: 'hidden',
    shadowColor: '#101828',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.1,
    shadowRadius: 18,
    elevation: 6,
  },
  content: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 9,
    paddingHorizontal: 14,
  },
  icon: {
    alignItems: 'center',
    justifyContent: 'center',
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#FFD400',
  },
  label: {
    flexShrink: 1,
    color: '#111111',
    fontSize: 14,
    fontWeight: '800',
  },
  pressed: {
    opacity: 0.86,
    transform: [{ scale: 0.98 }],
  },
});
