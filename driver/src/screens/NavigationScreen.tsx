import { Feather } from '@expo/vector-icons';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import MapView, { Marker, Polyline } from 'react-native-maps';
import { t } from '../i18n';
import { ActiveTrip, Coords } from '../types/order';

interface NavigationScreenProps {
  trip: ActiveTrip;
  driverPosition?: Coords;
  onArrived: () => void;
  onCancel: () => void;
}

export function NavigationScreen({ driverPosition, onArrived, onCancel, trip }: NavigationScreenProps) {
  const current = driverPosition ?? trip.pickup;

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
          <Polyline
            coordinates={[
              { latitude: current.lat, longitude: current.lng },
              { latitude: trip.pickup.lat, longitude: trip.pickup.lng },
            ]}
            strokeColor="#14532d"
            strokeWidth={4}
          />
        </MapView>
        <View style={styles.mapBadge}>
          <Feather color="#14532d" name="map-pin" size={22} />
          <Text style={styles.mapTitle}>{t('navigation')}</Text>
          <Text style={styles.mapMeta}>{trip.pickupAddress}</Text>
        </View>
      </View>
      <View style={styles.panel}>
        <View style={styles.stepPill}>
          <Text style={styles.stepPillText}>Шаг 1 из 3 · подача</Text>
        </View>
        <Text style={styles.title}>{t('goingToPickup')}</Text>
        <Text style={styles.subtitle}>{t('openRoute')}</Text>

        <View style={styles.routeBox}>
          <Text style={styles.label}>{t('pickup')}</Text>
          <Text style={styles.address}>{trip.pickupAddress}</Text>
          <Text style={styles.label}>{t('destination')}</Text>
          <Text style={styles.address}>{trip.dropoffAddress}</Text>
        </View>

        <View style={styles.actions}>
          <Pressable style={styles.mapButton}>
            <Feather color="#111827" name="navigation" size={22} />
            <Text style={styles.mapButtonText}>{t('maps')}</Text>
          </Pressable>
          <Pressable onPress={onArrived} style={styles.primaryButton}>
            <Text style={styles.primaryText}>{t('arrived')}</Text>
          </Pressable>
        </View>
        <Pressable onPress={onCancel} style={styles.cancelButton}>
          <Text style={styles.cancelText}>{t('cancelOrder')}</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#e2e8f0' },
  map: { flex: 1, backgroundColor: '#dcfce7' },
  routeLine: { position: 'absolute', left: 56, right: 56, top: '50%', height: 4, borderRadius: 4, backgroundColor: '#14532d', transform: [{ rotate: '-10deg' }] },
  mapBadge: { position: 'absolute', left: 16, right: 16, top: 16, padding: 12, borderRadius: 8, backgroundColor: 'rgba(255,255,255,0.92)' },
  mapTitle: { marginTop: 4, fontSize: 18, fontWeight: '900', color: '#14532d' },
  mapMeta: { marginTop: 4, color: '#166534', fontWeight: '700' },
  panel: { padding: 18, backgroundColor: '#ffffff' },
  stepPill: { alignSelf: 'flex-start', minHeight: 30, paddingHorizontal: 10, justifyContent: 'center', borderRadius: 8, backgroundColor: '#ecfdf5' },
  stepPillText: { color: '#166534', fontWeight: '900' },
  title: { marginTop: 12, fontSize: 24, fontWeight: '900', color: '#111827' },
  subtitle: { marginTop: 4, color: '#64748b' },
  routeBox: { marginTop: 14, padding: 14, borderWidth: 1, borderColor: '#e2e8f0', borderRadius: 8, backgroundColor: '#f8fafc' },
  label: { marginTop: 6, color: '#64748b', fontWeight: '700' },
  address: { marginTop: 3, fontSize: 16, fontWeight: '800', color: '#111827' },
  actions: { flexDirection: 'row', gap: 12, marginTop: 16 },
  mapButton: { width: 104, height: 52, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: '#cbd5e1', borderRadius: 8, backgroundColor: '#ffffff' },
  mapButtonText: { marginTop: 2, fontSize: 12, fontWeight: '800' },
  primaryButton: { flex: 1, height: 52, alignItems: 'center', justifyContent: 'center', borderRadius: 8, backgroundColor: '#111827' },
  primaryText: { color: '#ffffff', fontWeight: '900' },
  cancelButton: { height: 48, marginTop: 12, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: '#fecaca', borderRadius: 8, backgroundColor: '#fff1f2' },
  cancelText: { fontWeight: '900', color: '#b91c1c' },
});
