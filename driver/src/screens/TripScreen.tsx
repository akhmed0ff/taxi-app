import { Pressable, StyleSheet, Text, View } from 'react-native';
import MapView, { Marker, Polyline } from 'react-native-maps';
import { t } from '../i18n';
import { ActiveTrip, Coords } from '../types/order';

interface TripScreenProps {
  trip: ActiveTrip;
  driverPosition?: Coords;
  onStart: () => void;
  onComplete: () => void;
}

export function TripScreen({ driverPosition, trip, onStart, onComplete }: TripScreenProps) {
  const isInProgress = trip.status === 'IN_PROGRESS';
  const current = driverPosition ?? (isInProgress ? trip.dropoff : trip.pickup);

  return (
    <View style={styles.screen}>
      <View style={styles.map}>
        <MapView
          initialRegion={{
            latitude: current.lat,
            longitude: current.lng,
            latitudeDelta: 0.08,
            longitudeDelta: 0.08,
          }}
          region={{
            latitude: current.lat,
            longitude: current.lng,
            latitudeDelta: 0.08,
            longitudeDelta: 0.08,
          }}
          style={StyleSheet.absoluteFill}
        >
          <Marker coordinate={{ latitude: current.lat, longitude: current.lng }} pinColor="#111827" title="Водитель" />
          <Marker coordinate={{ latitude: trip.pickup.lat, longitude: trip.pickup.lng }} pinColor="#0f766e" title={trip.pickupAddress} />
          <Marker coordinate={{ latitude: trip.dropoff.lat, longitude: trip.dropoff.lng }} pinColor="#dc2626" title={trip.dropoffAddress} />
          <Polyline
            coordinates={[
              { latitude: trip.pickup.lat, longitude: trip.pickup.lng },
              { latitude: trip.dropoff.lat, longitude: trip.dropoff.lng },
            ]}
            strokeColor="#1d4ed8"
            strokeWidth={4}
          />
        </MapView>
        <View style={styles.mapBadge}>
          <Text style={styles.mapTitle}>{isInProgress ? t('tripInProgress') : t('passengerNearby')}</Text>
          <Text style={styles.mapMeta}>{trip.dropoffAddress}</Text>
        </View>
      </View>
      <View style={styles.panel}>
        <View style={styles.stepPill}>
          <Text style={styles.stepPillText}>{isInProgress ? 'Шаг 3 из 3 · поездка' : 'Шаг 2 из 3 · посадка'}</Text>
        </View>
        <Text style={styles.title}>{isInProgress ? t('drivePassenger') : t('startTrip')}</Text>
        <Text style={styles.routeText}>{trip.pickupAddress} → {trip.dropoffAddress}</Text>
        <Text style={styles.price}>{trip.price.toLocaleString()} {t('som')}</Text>

        <View style={styles.statusBox}>
          <StatusRow active label="Заказ принят" />
          <StatusRow active label="Водитель на месте" />
          <StatusRow active={isInProgress} label="Поездка началась" />
        </View>

        <Pressable onPress={isInProgress ? onComplete : onStart} style={styles.primaryButton}>
          <Text style={styles.primaryText}>{isInProgress ? t('complete') : t('start')}</Text>
        </Pressable>
      </View>
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
  screen: { flex: 1, backgroundColor: '#e2e8f0' },
  map: { flex: 1, backgroundColor: '#dbeafe' },
  routeLine: { position: 'absolute', left: 56, right: 56, top: '50%', height: 4, borderRadius: 4, backgroundColor: '#1d4ed8', transform: [{ rotate: '8deg' }] },
  mapBadge: { position: 'absolute', left: 16, right: 16, top: 16, padding: 12, borderRadius: 8, backgroundColor: 'rgba(255,255,255,0.92)' },
  mapTitle: { fontSize: 18, fontWeight: '900', color: '#0f172a' },
  mapMeta: { marginTop: 4, color: '#334155', fontWeight: '700' },
  panel: { padding: 18, backgroundColor: '#ffffff' },
  stepPill: { alignSelf: 'flex-start', minHeight: 30, paddingHorizontal: 10, justifyContent: 'center', borderRadius: 8, backgroundColor: '#eff6ff' },
  stepPillText: { color: '#1d4ed8', fontWeight: '900' },
  title: { marginTop: 12, fontSize: 24, fontWeight: '900', color: '#111827' },
  routeText: { marginTop: 8, color: '#334155', fontWeight: '700' },
  price: { marginTop: 10, fontSize: 28, fontWeight: '900', color: '#111827' },
  statusBox: { marginTop: 14, padding: 12, borderWidth: 1, borderColor: '#e2e8f0', borderRadius: 8, backgroundColor: '#f8fafc' },
  statusRow: { minHeight: 28, flexDirection: 'row', alignItems: 'center', gap: 10 },
  statusDot: { width: 10, height: 10, borderRadius: 5, backgroundColor: '#cbd5e1' },
  statusDotActive: { backgroundColor: '#16a34a' },
  statusText: { color: '#334155', fontWeight: '700' },
  primaryButton: { height: 54, marginTop: 16, alignItems: 'center', justifyContent: 'center', borderRadius: 8, backgroundColor: '#16a34a' },
  primaryText: { color: '#ffffff', fontSize: 16, fontWeight: '900' },
});
