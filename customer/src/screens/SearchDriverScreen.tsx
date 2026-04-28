import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import { t } from '../i18n';
import { Order } from '../types/order';

interface SearchDriverScreenProps {
  order: Order;
  onCancel: () => void;
}

export function SearchDriverScreen({ onCancel, order }: SearchDriverScreenProps) {
  return (
    <View style={styles.screen}>
      <View style={styles.mapPreview}>
        <View style={styles.routeLine} />
        <View style={[styles.point, styles.pickupPoint]} />
        <View style={[styles.point, styles.dropoffPoint]} />
      </View>

      <ActivityIndicator color="#111827" size="large" />
      <Text style={styles.title}>{t('searchingDriver')}</Text>
      <Text style={styles.subtitle}>{t('orderSent', { id: order.id })}</Text>

      <View style={styles.statusBox}>
        <StatusRow active label="Заказ создан" />
        <StatusRow active label="Цена рассчитана" />
        <StatusRow active label="Matching ищет ONLINE водителя" />
      </View>

      <View style={styles.routeBox}>
        <Text style={styles.label}>Откуда</Text>
        <Text style={styles.address}>{order.pickup.address ?? 'Точка подачи'}</Text>
        <Text style={styles.label}>Куда</Text>
        <Text style={styles.address}>{order.dropoff.address ?? 'Точка назначения'}</Text>
      </View>

      <Pressable onPress={onCancel} style={styles.secondaryButton}>
        <Text style={styles.secondaryButtonText}>{t('cancelOrder')}</Text>
      </Pressable>
    </View>
  );
}

function StatusRow({ active, label }: { active: boolean; label: string }) {
  return (
    <View style={styles.statusRow}>
      <View style={[styles.statusDot, active && styles.statusDotActive]} />
      <Text style={styles.statusText}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, padding: 20, backgroundColor: '#f8fafc' },
  mapPreview: { height: 170, marginTop: 8, marginBottom: 24, borderRadius: 8, overflow: 'hidden', backgroundColor: '#e0f2fe' },
  routeLine: { position: 'absolute', left: 68, right: 58, top: 82, height: 4, borderRadius: 4, backgroundColor: '#111827', transform: [{ rotate: '-10deg' }] },
  point: { position: 'absolute', width: 22, height: 22, borderRadius: 11, borderWidth: 4, borderColor: '#ffffff' },
  pickupPoint: { left: 54, top: 70, backgroundColor: '#16a34a' },
  dropoffPoint: { right: 48, top: 76, backgroundColor: '#ef4444' },
  title: { marginTop: 18, textAlign: 'center', fontSize: 26, fontWeight: '800', color: '#111827' },
  subtitle: { marginTop: 8, textAlign: 'center', color: '#64748b' },
  statusBox: { marginTop: 22, padding: 14, borderWidth: 1, borderColor: '#d1d5db', borderRadius: 8, backgroundColor: '#ffffff' },
  statusRow: { minHeight: 30, flexDirection: 'row', alignItems: 'center', gap: 10 },
  statusDot: { width: 10, height: 10, borderRadius: 5, backgroundColor: '#cbd5e1' },
  statusDotActive: { backgroundColor: '#16a34a' },
  statusText: { color: '#334155', fontWeight: '700' },
  routeBox: { marginTop: 14, padding: 14, borderWidth: 1, borderColor: '#e2e8f0', borderRadius: 8, backgroundColor: '#ffffff' },
  label: { marginTop: 6, color: '#64748b', fontWeight: '700' },
  address: { marginTop: 3, fontSize: 16, fontWeight: '800', color: '#111827' },
  secondaryButton: { height: 48, marginTop: 18, paddingHorizontal: 18, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: '#fecaca', borderRadius: 8, backgroundColor: '#fff1f2' },
  secondaryButtonText: { fontWeight: '800', color: '#b91c1c' },
});
