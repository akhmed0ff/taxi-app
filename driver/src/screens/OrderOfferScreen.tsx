import { useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { OrderOffer } from '../types/order';

interface OrderOfferScreenProps {
  offer: OrderOffer;
  onAccept: () => void;
  onDecline: () => void;
}

export function OrderOfferScreen({
  offer,
  onAccept,
  onDecline,
}: OrderOfferScreenProps) {
  const [secondsLeft, setSecondsLeft] = useState(offer.expiresInSeconds);

  useEffect(() => {
    const timer = setInterval(() => {
      setSecondsLeft((value) => Math.max(value - 1, 0));
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    if (secondsLeft === 0) {
      onDecline();
    }
  }, [onDecline, secondsLeft]);

  return (
    <View style={styles.screen}>
      <Text style={styles.timer}>{secondsLeft}</Text>
      <Text style={styles.title}>Новый заказ</Text>

      <View style={styles.routeBox}>
        <Text style={styles.label}>Подача</Text>
        <Text style={styles.address}>{offer.pickupAddress}</Text>
        <Text style={styles.label}>Куда</Text>
        <Text style={styles.address}>{offer.dropoffAddress}</Text>
      </View>

      <Text style={styles.price}>{offer.price.toLocaleString()} сум</Text>

      <View style={styles.actions}>
        <Pressable onPress={onDecline} style={styles.secondaryButton}>
          <Text style={styles.secondaryText}>Пропустить</Text>
        </Pressable>
        <Pressable onPress={onAccept} style={styles.primaryButton}>
          <Text style={styles.primaryText}>Принять</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    justifyContent: 'center',
    padding: 20,
    backgroundColor: '#f8fafc',
  },
  timer: {
    alignSelf: 'center',
    width: 72,
    height: 72,
    borderRadius: 36,
    textAlign: 'center',
    textAlignVertical: 'center',
    fontSize: 28,
    fontWeight: '900',
    color: '#ffffff',
    backgroundColor: '#111827',
  },
  title: {
    marginTop: 18,
    textAlign: 'center',
    fontSize: 28,
    fontWeight: '900',
    color: '#0f172a',
  },
  routeBox: {
    marginTop: 22,
    padding: 16,
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 8,
    backgroundColor: '#ffffff',
  },
  label: {
    marginTop: 8,
    color: '#64748b',
    fontWeight: '700',
  },
  address: {
    marginTop: 4,
    fontSize: 17,
    fontWeight: '800',
    color: '#111827',
  },
  price: {
    marginTop: 22,
    textAlign: 'center',
    fontSize: 32,
    fontWeight: '900',
    color: '#111827',
  },
  actions: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 22,
  },
  secondaryButton: {
    flex: 1,
    height: 52,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#cbd5e1',
    borderRadius: 8,
    backgroundColor: '#ffffff',
  },
  primaryButton: {
    flex: 1,
    height: 52,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 8,
    backgroundColor: '#16a34a',
  },
  secondaryText: {
    fontWeight: '800',
    color: '#111827',
  },
  primaryText: {
    fontWeight: '900',
    color: '#ffffff',
  },
});
