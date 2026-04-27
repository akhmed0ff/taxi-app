import { Feather } from '@expo/vector-icons';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { t } from '../i18n';
import { Order } from '../types/order';

interface TripScreenProps {
  order: Order;
  onCancel: () => void;
}

export function TripScreen({ onCancel, order }: TripScreenProps) {
  const canCancel = order.status !== 'IN_PROGRESS';

  return (
    <View style={styles.screen}>
      <View style={styles.map}>
        <Text style={styles.mapTitle}>{t('driverComing')}</Text>
        <Text style={styles.mapMeta}>{t('eta', { minutes: order.driver?.etaMinutes ?? 4 })}</Text>
      </View>
      <View style={styles.panel}>
        <Text style={styles.driverName}>{order.driver?.name}</Text>
        <Text style={styles.driverMeta}>{order.driver?.car} - {order.driver?.rating}</Text>
        <View style={styles.actions}>
          <Pressable style={styles.iconButton}><Feather color="#111827" name="message-circle" size={22} /></Pressable>
          <Pressable style={styles.iconButton}><Feather color="#111827" name="phone" size={22} /></Pressable>
        </View>
        {canCancel && (
          <Pressable onPress={onCancel} style={styles.cancelButton}>
            <Text style={styles.cancelText}>Отменить заказ</Text>
          </Pressable>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#e2e8f0' },
  map: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#dcfce7' },
  mapTitle: { fontSize: 30, fontWeight: '800', color: '#14532d' },
  mapMeta: { marginTop: 8, color: '#166534' },
  panel: { padding: 18, backgroundColor: '#ffffff' },
  driverName: { fontSize: 22, fontWeight: '800', color: '#111827' },
  driverMeta: { marginTop: 4, color: '#64748b' },
  actions: { flexDirection: 'row', gap: 12, marginTop: 16 },
  iconButton: { width: 48, height: 48, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: '#cbd5e1', borderRadius: 8, backgroundColor: '#ffffff' },
  cancelButton: { height: 48, marginTop: 14, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: '#fecaca', borderRadius: 8, backgroundColor: '#fff1f2' },
  cancelText: { fontWeight: '800', color: '#b91c1c' },
});
