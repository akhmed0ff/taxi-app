import { Pressable, StyleSheet, Text, View } from 'react-native';
import { t } from '../i18n';
import { Order } from '../types/order';

interface CompletionScreenProps {
  order: Order;
  onRestart: () => void;
}

export function CompletionScreen({ order, onRestart }: CompletionScreenProps) {
  return (
    <View style={styles.screen}>
      <Text style={styles.title}>{t('tripCompleted')}</Text>
      <Text style={styles.price}>{order.price.toLocaleString()} {t('som')}</Text>
      <Text style={styles.rating}>{t('rateTrip')}</Text>
      <Pressable onPress={onRestart} style={styles.primaryButton}>
        <Text style={styles.primaryButtonText}>{t('backHome')}</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, justifyContent: 'center', padding: 24, backgroundColor: '#f8fafc' },
  title: { fontSize: 28, fontWeight: '800', color: '#111827' },
  price: { marginTop: 16, fontSize: 36, fontWeight: '900', color: '#0f172a' },
  rating: { marginTop: 18, fontSize: 18, color: '#475569' },
  primaryButton: { height: 52, marginTop: 26, alignItems: 'center', justifyContent: 'center', borderRadius: 8, backgroundColor: '#111827' },
  primaryButtonText: { color: '#ffffff', fontWeight: '800' },
});
