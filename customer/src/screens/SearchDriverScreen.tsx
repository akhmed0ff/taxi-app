import { useEffect } from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import { Order } from '../types/order';

interface SearchDriverScreenProps {
  order: Order;
  onDriverFound: (order: Order) => void;
}

export function SearchDriverScreen({
  order,
  onDriverFound,
}: SearchDriverScreenProps) {
  useEffect(() => {
    const timer = setTimeout(() => {
      onDriverFound({
        ...order,
        status: 'DRIVER_ASSIGNED',
        driver: {
          id: 'driver-demo',
          name: 'Азиз',
          car: 'Chevrolet Cobalt',
          rating: 4.9,
          etaMinutes: 4,
        },
      });
    }, 1800);

    return () => clearTimeout(timer);
  }, [onDriverFound, order]);

  return (
    <View style={styles.screen}>
      <ActivityIndicator color="#111827" size="large" />
      <Text style={styles.title}>Ищем водителя</Text>
      <Text style={styles.subtitle}>Предлагаем заказ ближайшим водителям</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
    backgroundColor: '#f8fafc',
  },
  title: {
    marginTop: 22,
    fontSize: 26,
    fontWeight: '800',
    color: '#111827',
  },
  subtitle: {
    marginTop: 8,
    textAlign: 'center',
    color: '#64748b',
  },
});
