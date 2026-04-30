import { ReactNode } from 'react';
import {
  ActivityIndicator,
  Pressable,
  StyleProp,
  StyleSheet,
  Text,
  View,
  ViewStyle,
} from 'react-native';

type AppButtonVariant = 'primary' | 'yellow' | 'glass' | 'outline';
type AppButtonSize = 'md' | 'lg';

interface AppButtonProps {
  children?: ReactNode;
  disabled?: boolean;
  icon?: ReactNode;
  loading?: boolean;
  onPress?: () => void;
  size?: AppButtonSize;
  style?: StyleProp<ViewStyle>;
  title: string;
  variant?: AppButtonVariant;
}

export function AppButton({
  children,
  disabled = false,
  icon,
  loading = false,
  onPress,
  size = 'lg',
  style,
  title,
  variant = 'primary',
}: AppButtonProps) {
  const isDisabled = disabled || loading;

  return (
    <Pressable
      accessibilityRole="button"
      disabled={isDisabled}
      onPress={onPress}
      style={({ pressed }) => [
        styles.button,
        styles[size],
        styles[variant],
        isDisabled && styles.disabled,
        pressed && !isDisabled && styles.pressed,
        style,
      ]}
    >
      {loading ? <ActivityIndicator color={variant === 'primary' ? '#ffffff' : '#111111'} /> : null}
      {!loading && icon ? <View style={styles.icon}>{icon}</View> : null}
      {!loading ? (
        children ?? (
          <Text style={[styles.text, variant === 'primary' && styles.primaryText]}>
            {title}
          </Text>
        )
      ) : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 10,
    justifyContent: 'center',
    borderRadius: 24,
    paddingHorizontal: 20,
    shadowColor: '#101828',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.14,
    shadowRadius: 22,
    elevation: 8,
  },
  md: {
    minHeight: 48,
  },
  lg: {
    minHeight: 58,
  },
  primary: {
    backgroundColor: '#111111',
  },
  yellow: {
    backgroundColor: '#FFD400',
  },
  glass: {
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.82)',
    backgroundColor: 'rgba(255,255,255,0.64)',
  },
  outline: {
    borderWidth: 1,
    borderColor: 'rgba(17,17,17,0.12)',
    backgroundColor: '#ffffff',
    shadowOpacity: 0.06,
  },
  icon: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  text: {
    color: '#111111',
    fontSize: 16,
    fontWeight: '800',
  },
  primaryText: {
    color: '#ffffff',
  },
  pressed: {
    opacity: 0.88,
    transform: [{ scale: 0.98 }],
  },
  disabled: {
    opacity: 0.45,
  },
});
