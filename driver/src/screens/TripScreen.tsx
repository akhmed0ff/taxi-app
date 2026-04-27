import { Pressable, StyleSheet, Text, View } from 'react-native';
import { t } from '../i18n';
import { ActiveTrip } from '../types/order';

interface TripScreenProps {
  trip: ActiveTrip;
  onStart: () => void;
  onComplete: () => void;
}

export function TripScreen({ trip, onStart, onComplete }: TripScreenProps) {
  const isInProgress = trip.status === 'IN_PROGRESS';

  return (
    <View style={styles.screen}>
      <View style={styles.map}>
        <Text style={styles.mapTitle}>{isInProgress ? t('tripInProgress') : t('passengerNearby')}</Text>
        <Text style={styles.mapMeta}>{trip.dropoffAddress}</Text>
      </View>
      <View style={styles.panel}>
        <Text style={styles.title}>{isInProgress ? t('drivePassenger') : t('startTrip')}</Text>
        <Text style={styles.price}>{trip.price.toLocaleString()} {t('som')}</Text>
        <Pressable onPress={isInProgress ? onComplete : onStart} style={styles.primaryButton}>
          <Text style={styles.primaryText}>{isInProgress ? t('complete') : t('start')}</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#e2e8f0' },
  map: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#dbeafe' },
  mapTitle: { fontSize: 30, fontWeight: '900', color: '#0f172a' },
  mapMeta: { marginTop: 8, color: '#334155' },
  panel: { padding: 18, backgroundColor: '#ffffff' },
  title: { fontSize: 24, fontWeight: '900', color: '#111827' },
  price: { marginTop: 10, fontSize: 28, fontWeight: '900', color: '#111827' },
  primaryButton: { height: 54, marginTop: 16, alignItems: 'center', justifyContent: 'center', borderRadius: 8, backgroundColor: '#16a34a' },
  primaryText: { color: '#ffffff', fontSize: 16, fontWeight: '900' },
});
