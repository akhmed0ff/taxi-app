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
      <ActivityIndicator color="#111827" size="large" />
      <Text style={styles.title}>{t('searchingDriver')}</Text>
      <Text style={styles.subtitle}>{t('orderSent', { id: order.id })}</Text>
      <Pressable onPress={onCancel} style={styles.secondaryButton}>
        <Text style={styles.secondaryButtonText}>Отменить заказ</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24, backgroundColor: '#f8fafc' },
  title: { marginTop: 22, fontSize: 26, fontWeight: '800', color: '#111827' },
  subtitle: { marginTop: 8, textAlign: 'center', color: '#64748b' },
  secondaryButton: { height: 48, marginTop: 24, paddingHorizontal: 18, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: '#cbd5e1', borderRadius: 8, backgroundColor: '#ffffff' },
  secondaryButtonText: { fontWeight: '800', color: '#b91c1c' },
});
