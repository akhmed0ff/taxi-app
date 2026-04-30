import { ReactNode } from 'react';
import { Pressable, StyleProp, StyleSheet, ViewStyle } from 'react-native';

type IconButtonVariant = 'glass' | 'yellow' | 'dark';

interface IconButtonProps {
  accessibilityLabel: string;
  disabled?: boolean;
  icon: ReactNode;
  onPress?: () => void;
  size?: number;
  style?: StyleProp<ViewStyle>;
  variant?: IconButtonVariant;
}

export function IconButton({
  accessibilityLabel,
  disabled = false,
  icon,
  onPress,
  size = 52,
  style,
  variant = 'glass',
}: IconButtonProps) {
  return (
    <Pressable
      accessibilityLabel={accessibilityLabel}
      accessibilityRole="button"
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [
        styles.button,
        styles[variant],
        { borderRadius: size / 2, height: size, width: size },
        disabled && styles.disabled,
        pressed && !disabled && styles.pressed,
        style,
      ]}
    >
      {icon}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#101828',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.12,
    shadowRadius: 20,
    elevation: 7,
  },
  glass: {
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.82)',
    backgroundColor: 'rgba(255,255,255,0.72)',
  },
  yellow: {
    backgroundColor: '#FFD400',
  },
  dark: {
    backgroundColor: '#111111',
  },
  pressed: {
    opacity: 0.86,
    transform: [{ scale: 0.96 }],
  },
  disabled: {
    opacity: 0.45,
  },
});
