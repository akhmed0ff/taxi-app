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
  const copy = getTripCopy(order.status);

  return (
    <View style={styles.screen}>
      <View style={styles.map}>
        <View style={styles.routeLine} />
        <View style={[styles.point, styles.pickupPoint]} />
        <View style={[styles.point, styles.dropoffPoint]} />
        <View style={[styles.carMarker, order.status === 'IN_PROGRESS' && styles.carMarkerMoving]}>
          <Feather color="#ffffff" name="navigation" size={18} />
        </View>
        <Text style={styles.mapTitle}>{copy.title}</Text>
        <Text style={styles.mapMeta}>{copy.subtitle}</Text>
      </View>

      <View style={styles.panel}>
        <View style={styles.statusPill}>
          <Text style={styles.statusPillText}>{copy.badge}</Text>
        </View>

        <Text style={styles.driverName}>{order.driver?.name ?? 'Водитель назначается'}</Text>
        <Text style={styles.driverMeta}>
          {order.driver?.car ?? 'ANGREN TAXI'} · рейтинг {order.driver?.rating ?? 5}
        </Text>
        <Text style={styles.routeText}>
          {order.pickup.address ?? 'Точка подачи'} → {order.dropoff.address ?? 'Точка назначения'}
        </Text>
        {order.fareBreakdown && (
          <View style={styles.fareBox}>
            <FareRow label="Подача" value={order.fareBreakdown.baseFareAmount} />
            <FareRow label={`${order.fareBreakdown.distanceKm} км`} value={order.fareBreakdown.distanceAmount} />
            <FareRow label="Ожидание" value={order.fareBreakdown.waitingAmount} />
            <FareRow label="Остановки" value={order.fareBreakdown.stopAmount} />
            <FareRow strong label="Итого" value={order.fareBreakdown.total} />
          </View>
        )}

        <View style={styles.progressBox}>
          <ProgressStep active label="Водитель найден" />
          <ProgressStep active={order.status === 'DRIVER_ARRIVED' || order.status === 'IN_PROGRESS'} label="На месте" />
          <ProgressStep active={order.status === 'IN_PROGRESS'} label="Поездка" />
        </View>

        {order.driverLocation && (
          <Text style={styles.locationText}>
            Водитель движется: {order.driverLocation.lat.toFixed(5)}, {order.driverLocation.lng.toFixed(5)}
          </Text>
        )}

        <View style={styles.actions}>
          <Pressable style={styles.iconButton}><Feather color="#111827" name="message-circle" size={22} /></Pressable>
          <Pressable style={styles.iconButton}><Feather color="#111827" name="phone" size={22} /></Pressable>
        </View>
        {canCancel && (
          <Pressable onPress={onCancel} style={styles.cancelButton}>
            <Text style={styles.cancelText}>{t('cancelOrder')}</Text>
          </Pressable>
        )}
      </View>
    </View>
  );
}

function ProgressStep({ active, label }: { active: boolean; label: string }) {
  return (
    <View style={styles.progressStep}>
      <View style={[styles.progressDot, active && styles.progressDotActive]} />
      <Text style={[styles.progressText, active && styles.progressTextActive]}>{label}</Text>
    </View>
  );
}

function FareRow({
  label,
  strong = false,
  value,
}: {
  label: string;
  strong?: boolean;
  value: number;
}) {
  return (
    <View style={styles.fareRow}>
      <Text style={[styles.fareLabel, strong && styles.fareStrong]}>{label}</Text>
      <Text style={[styles.fareValue, strong && styles.fareStrong]}>
        {value.toLocaleString('ru-RU')} {t('som')}
      </Text>
    </View>
  );
}

function getTripCopy(status: Order['status']) {
  if (status === 'DRIVER_ARRIVED') {
    return {
      title: t('driverArrived'),
      subtitle: 'Выходите к точке подачи',
      badge: 'Водитель на месте',
    };
  }

  if (status === 'IN_PROGRESS') {
    return {
      title: t('tripInProgress'),
      subtitle: 'Следим за поездкой до точки назначения',
      badge: 'Поездка идет',
    };
  }

  return {
    title: t('driverFound'),
    subtitle: t('eta', { minutes: 4 }),
    badge: 'Водитель едет к вам',
  };
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#e2e8f0' },
  map: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#dcfce7' },
  routeLine: { position: 'absolute', left: 58, right: 58, top: '48%', height: 4, borderRadius: 4, backgroundColor: '#14532d', transform: [{ rotate: '-8deg' }] },
  point: { position: 'absolute', width: 22, height: 22, borderRadius: 11, borderWidth: 4, borderColor: '#ffffff' },
  pickupPoint: { left: 48, top: '44%', backgroundColor: '#16a34a' },
  dropoffPoint: { right: 48, top: '50%', backgroundColor: '#ef4444' },
  carMarker: { position: 'absolute', left: '42%', top: '43%', width: 38, height: 38, borderRadius: 19, alignItems: 'center', justifyContent: 'center', backgroundColor: '#111827' },
  carMarkerMoving: { left: '58%', top: '47%' },
  mapTitle: { fontSize: 30, fontWeight: '800', color: '#14532d' },
  mapMeta: { marginTop: 8, color: '#166534', fontWeight: '700' },
  panel: { padding: 18, backgroundColor: '#ffffff' },
  statusPill: { alignSelf: 'flex-start', minHeight: 30, paddingHorizontal: 10, justifyContent: 'center', borderRadius: 8, backgroundColor: '#ecfdf5' },
  statusPillText: { color: '#166534', fontWeight: '900' },
  driverName: { marginTop: 12, fontSize: 22, fontWeight: '800', color: '#111827' },
  driverMeta: { marginTop: 4, color: '#64748b' },
  routeText: { marginTop: 10, color: '#334155', fontWeight: '700' },
  fareBox: { marginTop: 12, padding: 12, borderWidth: 1, borderColor: '#e2e8f0', borderRadius: 8, backgroundColor: '#f8fafc' },
  fareRow: { minHeight: 24, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  fareLabel: { color: '#64748b', fontWeight: '700' },
  fareValue: { color: '#111827', fontWeight: '800' },
  fareStrong: { color: '#111827', fontWeight: '900' },
  progressBox: { marginTop: 14, flexDirection: 'row', gap: 8 },
  progressStep: { flex: 1, minHeight: 54, padding: 8, borderWidth: 1, borderColor: '#e2e8f0', borderRadius: 8, backgroundColor: '#f8fafc' },
  progressDot: { width: 9, height: 9, borderRadius: 5, backgroundColor: '#cbd5e1' },
  progressDotActive: { backgroundColor: '#16a34a' },
  progressText: { marginTop: 5, fontSize: 12, color: '#64748b', fontWeight: '800' },
  progressTextActive: { color: '#111827' },
  locationText: { marginTop: 12, color: '#64748b', fontWeight: '700' },
  actions: { flexDirection: 'row', gap: 12, marginTop: 16 },
  iconButton: { width: 48, height: 48, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: '#cbd5e1', borderRadius: 8, backgroundColor: '#ffffff' },
  cancelButton: { height: 48, marginTop: 14, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: '#fecaca', borderRadius: 8, backgroundColor: '#fff1f2' },
  cancelText: { fontWeight: '800', color: '#b91c1c' },
});
