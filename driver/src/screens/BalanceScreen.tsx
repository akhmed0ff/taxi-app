import { Pressable, StyleSheet, Text, View } from 'react-native';
import { t } from '../i18n';

interface BalanceScreenProps {
  earnedToday: number;
  onBackOnline: () => void;
}

export function BalanceScreen({ earnedToday, onBackOnline }: BalanceScreenProps) {
  return (
    <View style={styles.screen}>
      <Text style={styles.title}>{t('balance')}</Text>
      <Text style={styles.amount}>{earnedToday.toLocaleString()} {t('som')}</Text>
      <View style={styles.row}>
        <Text style={styles.rowLabel}>{t('availablePayout')}</Text>
        <Text style={styles.rowValue}>{earnedToday.toLocaleString()} {t('som')}</Text>
      </View>
      <View style={styles.row}>
        <Text style={styles.rowLabel}>{t('commission')}</Text>
        <Text style={styles.rowValue}>12%</Text>
      </View>
      <Pressable onPress={onBackOnline} style={styles.primaryButton}>
        <Text style={styles.primaryText}>{t('backOnline')}</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, justifyContent: 'center', padding: 24, backgroundColor: '#f8fafc' },
  title: { fontSize: 28, fontWeight: '900', color: '#111827' },
  amount: { marginTop: 12, fontSize: 42, fontWeight: '900', color: '#0f172a' },
  row: { minHeight: 48, marginTop: 12, padding: 14, borderWidth: 1, borderColor: '#d1d5db', borderRadius: 8, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: '#ffffff' },
  rowLabel: { color: '#64748b' },
  rowValue: { fontWeight: '900', color: '#111827' },
  primaryButton: { height: 52, marginTop: 20, alignItems: 'center', justifyContent: 'center', borderRadius: 8, backgroundColor: '#111827' },
  primaryText: { color: '#ffffff', fontWeight: '900' },
});
