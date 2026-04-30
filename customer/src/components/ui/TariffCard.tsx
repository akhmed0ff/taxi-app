import { ReactNode } from 'react';
import { Pressable, StyleProp, StyleSheet, Text, View, ViewStyle } from 'react-native';

interface TariffCardProps {
  description?: string;
  eta?: string;
  icon?: ReactNode;
  onPress?: () => void;
  price: string;
  selected?: boolean;
  style?: StyleProp<ViewStyle>;
  title: string;
}

export function TariffCard({
  description,
  eta,
  icon,
  onPress,
  price,
  selected = false,
  style,
  title,
}: TariffCardProps) {
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => [
        styles.card,
        selected && styles.selected,
        pressed && styles.pressed,
        style,
      ]}
    >
      <View style={[styles.iconWrap, selected && styles.selectedIconWrap]}>
        {icon}
      </View>

      <View style={styles.content}>
        <View style={styles.header}>
          <Text numberOfLines={1} style={styles.title}>
            {title}
          </Text>
          <Text style={styles.price}>{price}</Text>
        </View>
        <View style={styles.metaRow}>
          {description ? (
            <Text numberOfLines={1} style={styles.description}>
              {description}
            </Text>
          ) : null}
          {eta ? <Text style={styles.eta}>{eta}</Text> : null}
        </View>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    minHeight: 88,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.82)',
    borderRadius: 24,
    padding: 14,
    backgroundColor: 'rgba(255,255,255,0.72)',
    shadowColor: '#101828',
    shadowOffset: { width: 0, height: 14 },
    shadowOpacity: 0.1,
    shadowRadius: 26,
    elevation: 8,
  },
  selected: {
    borderColor: '#FFD400',
    backgroundColor: 'rgba(255, 249, 210, 0.92)',
  },
  pressed: {
    opacity: 0.9,
    transform: [{ scale: 0.99 }],
  },
  iconWrap: {
    alignItems: 'center',
    justifyContent: 'center',
    width: 56,
    height: 56,
    borderRadius: 20,
    backgroundColor: 'rgba(17,17,17,0.06)',
  },
  selectedIconWrap: {
    backgroundColor: '#FFD400',
  },
  content: {
    flex: 1,
    minWidth: 0,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  title: {
    flex: 1,
    color: '#111111',
    fontSize: 17,
    fontWeight: '900',
  },
  price: {
    color: '#111111',
    fontSize: 20,
    fontWeight: '900',
  },
  metaRow: {
    marginTop: 6,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  description: {
    flex: 1,
    color: '#667085',
    fontSize: 12,
    fontWeight: '700',
  },
  eta: {
    color: '#111111',
    fontSize: 13,
    fontWeight: '800',
  },
});
