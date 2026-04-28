import { useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { t } from '../i18n';
import { OrderOffer } from '../types/order';

interface OrderOfferScreenProps {
  offer: OrderOffer;
  onAccept: () => void;
  onDecline: () => void;
}

export function OrderOfferScreen({ offer, onAccept, onDecline }: OrderOfferScreenProps) {
  const [secondsLeft, setSecondsLeft] = useState(offer.expiresInSeconds);

  useEffect(() => {
    setSecondsLeft(offer.expiresInSeconds);
  }, [offer.id, offer.expiresInSeconds]);

  useEffect(() => {
    const timer = setInterval(() => setSecondsLeft((value) => Math.max(value - 1, 0)), 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    if (secondsLeft === 0) onDecline();
  }, [onDecline, secondsLeft]);

  return (
    <View style={styles.screen}>
      <View style={styles.timerWrap}>
        <Text style={styles.timer}>{secondsLeft}</Text>
        <Text style={styles.timerLabel}>сек</Text>
      </View>
      <Text style={styles.title}>{t('newOrder')}</Text>
      <Text style={styles.subtitle}>Примите заказ до окончания таймера</Text>

      <View style={styles.routeBox}>
        <RoutePoint label={t('pickup')} value={offer.pickupAddress} />
        <View style={styles.divider} />
        <RoutePoint label={t('destination')} value={offer.dropoffAddress} />
      </View>

      <View style={styles.summaryRow}>
        <View style={styles.summaryCard}>
          <Text style={styles.summaryLabel}>До подачи</Text>
          <Text style={styles.summaryValue}>{Math.max(1, Math.round(offer.distanceMeters / 1000))} км</Text>
        </View>
        <View style={styles.summaryCard}>
          <Text style={styles.summaryLabel}>Цена</Text>
          <Text style={styles.summaryValue}>{offer.price.toLocaleString()} {t('som')}</Text>
        </View>
      </View>

      <View style={styles.actions}>
        <Pressable onPress={onDecline} style={styles.secondaryButton}>
          <Text style={styles.secondaryText}>{t('skip')}</Text>
        </Pressable>
        <Pressable onPress={onAccept} style={styles.primaryButton}>
          <Text style={styles.primaryText}>{t('accept')}</Text>
        </Pressable>
      </View>
    </View>
  );
}

function RoutePoint({ label, value }: { label: string; value: string }) {
  return (
    <View>
      <Text style={styles.label}>{label}</Text>
      <Text style={styles.address}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, justifyContent: 'center', padding: 20, backgroundColor: '#f8fafc' },
  timerWrap: { alignSelf: 'center', width: 86, height: 86, borderRadius: 43, alignItems: 'center', justifyContent: 'center', backgroundColor: '#111827' },
  timer: { fontSize: 28, fontWeight: '900', color: '#ffffff' },
  timerLabel: { marginTop: -2, fontSize: 12, fontWeight: '800', color: '#cbd5e1' },
  title: { marginTop: 18, textAlign: 'center', fontSize: 28, fontWeight: '900', color: '#0f172a' },
  subtitle: { marginTop: 6, textAlign: 'center', color: '#64748b', fontWeight: '700' },
  routeBox: { marginTop: 22, padding: 16, borderWidth: 1, borderColor: '#d1d5db', borderRadius: 8, backgroundColor: '#ffffff' },
  divider: { height: 1, marginVertical: 14, backgroundColor: '#e2e8f0' },
  label: { color: '#64748b', fontWeight: '700' },
  address: { marginTop: 4, fontSize: 17, fontWeight: '800', color: '#111827' },
  summaryRow: { flexDirection: 'row', gap: 12, marginTop: 14 },
  summaryCard: { flex: 1, minHeight: 74, padding: 12, borderWidth: 1, borderColor: '#e2e8f0', borderRadius: 8, backgroundColor: '#ffffff' },
  summaryLabel: { color: '#64748b', fontWeight: '700' },
  summaryValue: { marginTop: 6, fontSize: 18, fontWeight: '900', color: '#111827' },
  actions: { flexDirection: 'row', gap: 12, marginTop: 22 },
  secondaryButton: { flex: 1, height: 52, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: '#cbd5e1', borderRadius: 8, backgroundColor: '#ffffff' },
  primaryButton: { flex: 1, height: 52, alignItems: 'center', justifyContent: 'center', borderRadius: 8, backgroundColor: '#16a34a' },
  secondaryText: { fontWeight: '800', color: '#111827' },
  primaryText: { fontWeight: '900', color: '#ffffff' },
});
