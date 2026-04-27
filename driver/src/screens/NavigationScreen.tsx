import { Feather } from '@expo/vector-icons';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { ActiveTrip } from '../types/order';

interface NavigationScreenProps {
  trip: ActiveTrip;
  onArrived: () => void;
}

export function NavigationScreen({ trip, onArrived }: NavigationScreenProps) {
  return (
    <View style={styles.screen}>
      <View style={styles.map}>
        <Feather color="#14532d" name="map-pin" size={42} />
        <Text style={styles.mapTitle}>Навигация</Text>
        <Text style={styles.mapMeta}>{trip.pickupAddress}</Text>
      </View>

      <View style={styles.panel}>
        <Text style={styles.title}>Едем на подачу</Text>
        <Text style={styles.subtitle}>Откройте маршрут в картах</Text>

        <View style={styles.actions}>
          <Pressable style={styles.mapButton}>
            <Feather color="#111827" name="navigation" size={22} />
            <Text style={styles.mapButtonText}>Карты</Text>
          </Pressable>
          <Pressable onPress={onArrived} style={styles.primaryButton}>
            <Text style={styles.primaryText}>Я на месте</Text>
          </Pressable>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: '#e2e8f0',
  },
  map: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#dcfce7',
  },
  mapTitle: {
    marginTop: 8,
    fontSize: 30,
    fontWeight: '900',
    color: '#14532d',
  },
  mapMeta: {
    marginTop: 8,
    color: '#166534',
  },
  panel: {
    padding: 18,
    backgroundColor: '#ffffff',
  },
  title: {
    fontSize: 24,
    fontWeight: '900',
    color: '#111827',
  },
  subtitle: {
    marginTop: 4,
    color: '#64748b',
  },
  actions: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 16,
  },
  mapButton: {
    width: 104,
    height: 52,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#cbd5e1',
    borderRadius: 8,
    backgroundColor: '#ffffff',
  },
  mapButtonText: {
    marginTop: 2,
    fontSize: 12,
    fontWeight: '800',
  },
  primaryButton: {
    flex: 1,
    height: 52,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 8,
    backgroundColor: '#111827',
  },
  primaryText: {
    color: '#ffffff',
    fontWeight: '900',
  },
});
