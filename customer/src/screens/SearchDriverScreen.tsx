import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import { Order } from '../types/order';

interface SearchDriverScreenProps {
  order: Order;
}

export function SearchDriverScreen({ order }: SearchDriverScreenProps) {
  return (
    <View style={styles.screen}>
      <ActivityIndicator color="#111827" size="large" />
      <Text style={styles.title}>Ищем водителя</Text>
      <Text style={styles.subtitle}>
        Заказ {order.id} отправлен ближайшим водителям
      </Text>
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
