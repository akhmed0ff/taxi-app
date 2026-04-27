import * as Location from 'expo-location';
import { useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { t } from '../i18n';
import { Point } from '../types/order';

interface HomeMapScreenProps {
  onRouteSelected: (pickup: Point, dropoff: Point) => void;
}

export function HomeMapScreen({ onRouteSelected }: HomeMapScreenProps) {
  const [pickupAddress, setPickupAddress] = useState<string>(t('currentLocation'));
  const [dropoffAddress, setDropoffAddress] = useState('');
  const [currentPoint, setCurrentPoint] = useState<Point>({
    lat: 41.0167,
    lng: 70.1436,
    address: t('currentLocation'),
  });

  useEffect(() => {
    void Location.requestForegroundPermissionsAsync().then(async ({ status }) => {
      if (status !== 'granted') return;
      const location = await Location.getCurrentPositionAsync({});
      setCurrentPoint({
        lat: location.coords.latitude,
        lng: location.coords.longitude,
        address: pickupAddress,
      });
    });
  }, [pickupAddress]);

  return (
    <View style={styles.screen}>
      <View style={styles.map}>
        <Text style={styles.mapTitle}>{t('map')}</Text>
        <Text style={styles.mapMeta}>{currentPoint.lat.toFixed(4)}, {currentPoint.lng.toFixed(4)}</Text>
      </View>
      <View style={styles.panel}>
        <Text style={styles.label}>{t('from')}</Text>
        <TextInput onChangeText={setPickupAddress} style={styles.input} value={pickupAddress} />
        <Text style={styles.label}>{t('to')}</Text>
        <TextInput onChangeText={setDropoffAddress} placeholder={t('enterDestination')} style={styles.input} value={dropoffAddress} />
        <Pressable
          disabled={!dropoffAddress}
          onPress={() => onRouteSelected(
            { ...currentPoint, address: pickupAddress },
            { lat: currentPoint.lat + 0.035, lng: currentPoint.lng + 0.035, address: dropoffAddress },
          )}
          style={[styles.primaryButton, !dropoffAddress && styles.disabled]}
        >
          <Text style={styles.primaryButtonText}>{t('selectTariff')}</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#e2e8f0' },
  map: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#dbeafe' },
  mapTitle: { fontSize: 32, fontWeight: '800', color: '#0f172a' },
  mapMeta: { marginTop: 8, color: '#334155' },
  panel: { padding: 16, backgroundColor: '#ffffff' },
  label: { marginTop: 10, marginBottom: 6, fontWeight: '700', color: '#334155' },
  input: { height: 48, borderWidth: 1, borderColor: '#cbd5e1', borderRadius: 8, paddingHorizontal: 12 },
  primaryButton: { height: 50, marginTop: 16, alignItems: 'center', justifyContent: 'center', borderRadius: 8, backgroundColor: '#111827' },
  disabled: { opacity: 0.45 },
  primaryButtonText: { color: '#ffffff', fontWeight: '700' },
});
