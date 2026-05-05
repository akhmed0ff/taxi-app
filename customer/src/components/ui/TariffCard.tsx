import { ReactNode } from 'react';
import { Pressable, StyleProp, StyleSheet, Text, View, ViewStyle } from 'react-native';

function formatSeatsRu(count: number): string {
  const n = Math.max(1, Math.trunc(count) || 4);
  const v = n % 100;
  if (v >= 11 && v <= 14) {
    return `${n} мест`;
  }
  const last = n % 10;
  if (last === 1) {
    return `${n} место`;
  }
  if (last >= 2 && last <= 4) {
    return `${n} места`;
  }
  return `${n} мест`;
}

interface TariffCardProps {
  etaMinutes: number;
  icon?: ReactNode;
  onPress?: () => void;
  price: string;
  seats: number;
  selected?: boolean;
  style?: StyleProp<ViewStyle>;
  title: string;
}

export function TariffCard({
  etaMinutes,
  icon,
  onPress,
  price,
  seats,
  selected = false,
  style,
  title,
}: TariffCardProps) {
  const seatsText = formatSeatsRu(seats);
  const etaText = `≈ ${etaMinutes} мин`;

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
      <View style={[styles.iconWrap, selected && styles.selectedIconWrap]}>{icon}</View>

      <View style={styles.content}>
        <View style={styles.header}>
          <Text numberOfLines={1} style={styles.title}>
            {title}
          </Text>
        </View>
        <Text numberOfLines={1} style={styles.meta}>
          {seatsText}
          <Text style={styles.metaDot}> · </Text>
          {etaText}
        </Text>
        <Text numberOfLines={1} style={styles.price}>
          {price}
        </Text>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    minHeight: 96,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    borderWidth: 2,
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
    backgroundColor: 'rgba(255, 249, 210, 0.95)',
  },
  pressed: {
    opacity: 0.92,
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
    gap: 4,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  title: {
    flex: 1,
    color: '#111111',
    fontSize: 17,
    fontWeight: '900',
  },
  meta: {
    color: '#667085',
    fontSize: 13,
    fontWeight: '700',
  },
  metaDot: {
    color: '#98A2B3',
    fontWeight: '700',
  },
  price: {
    marginTop: 2,
    color: '#111111',
    fontSize: 18,
    fontWeight: '900',
  },
});
