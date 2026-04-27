import { Pressable, StyleSheet, Text, View } from 'react-native';
import { DriverStatus } from '../types/order';

interface OnlineScreenProps {
  status: DriverStatus;
  onToggleOnline: () => void;
}

export function OnlineScreen({ status, onToggleOnline }: OnlineScreenProps) {
  const isOnline = status === 'ONLINE' || status === 'BUSY';

  return (
    <View style={styles.screen}>
      <Text style={styles.title}>Водитель</Text>
      <Text style={styles.subtitle}>
        {isOnline ? 'Вы на линии' : 'Вы не принимаете заказы'}
      </Text>

      <Pressable
        onPress={onToggleOnline}
        style={[styles.statusButton, isOnline && styles.onlineButton]}
      >
        <Text style={styles.statusButtonText}>
          {isOnline ? 'Уйти оффлайн' : 'Выйти онлайн'}
        </Text>
      </Pressable>

      <View style={styles.info}>
        <Text style={styles.infoTitle}>Геотрекинг</Text>
        <Text style={styles.infoText}>
          {isOnline
            ? 'Координаты отправляются каждые 2-3 секунды'
            : 'Включится после выхода онлайн'}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    justifyContent: 'center',
    padding: 24,
    backgroundColor: '#f8fafc',
  },
  title: {
    fontSize: 36,
    fontWeight: '900',
    color: '#0f172a',
  },
  subtitle: {
    marginTop: 8,
    fontSize: 18,
    color: '#475569',
  },
  statusButton: {
    height: 58,
    marginTop: 26,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 8,
    backgroundColor: '#111827',
  },
  onlineButton: {
    backgroundColor: '#b91c1c',
  },
  statusButtonText: {
    color: '#ffffff',
    fontSize: 17,
    fontWeight: '800',
  },
  info: {
    marginTop: 24,
    padding: 16,
    borderWidth: 1,
    borderColor: '#cbd5e1',
    borderRadius: 8,
    backgroundColor: '#ffffff',
  },
  infoTitle: {
    fontWeight: '800',
    color: '#0f172a',
  },
  infoText: {
    marginTop: 6,
    color: '#64748b',
  },
});
