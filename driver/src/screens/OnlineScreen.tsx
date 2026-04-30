import { Pressable, StyleSheet, Text, View } from 'react-native';
import { t } from '../i18n';
import { DriverStatus } from '../types/order';

interface OnlineScreenProps {
  connectionLabel?: string;
  status: DriverStatus;
  onToggleOnline: () => void;
  onOpenHistory: () => void;
  onLogout: () => void;
}

export function OnlineScreen({
  connectionLabel,
  onLogout,
  onOpenHistory,
  status,
  onToggleOnline,
}: OnlineScreenProps) {
  const isOnline = status === 'ONLINE' || status === 'BUSY';

  return (
    <View style={styles.screen}>
      <Text style={styles.title}>{t('driver')}</Text>
      <Text style={styles.subtitle}>{isOnline ? t('online') : t('offline')}</Text>
      {connectionLabel ? (
        <Text style={styles.connectionStatus}>{connectionLabel}</Text>
      ) : null}
      <Pressable onPress={onToggleOnline} style={[styles.statusButton, isOnline && styles.onlineButton]}>
        <Text style={styles.statusButtonText}>{isOnline ? t('goOffline') : t('goOnline')}</Text>
      </Pressable>
      <Pressable onPress={onOpenHistory} style={styles.secondaryButton}>
        <Text style={styles.secondaryButtonText}>История заказов</Text>
      </Pressable>
      <Pressable onPress={onLogout} style={styles.secondaryButton}>
        <Text style={styles.secondaryButtonText}>Выйти</Text>
      </Pressable>
      <View style={styles.info}>
        <Text style={styles.infoTitle}>{t('geotracking')}</Text>
        <Text style={styles.infoText}>{isOnline ? t('trackingOn') : t('trackingOff')}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, justifyContent: 'center', padding: 24, backgroundColor: '#f8fafc' },
  title: { fontSize: 36, fontWeight: '900', color: '#0f172a' },
  subtitle: { marginTop: 8, fontSize: 18, color: '#475569' },
  connectionStatus: { marginTop: 8, color: '#b91c1c', fontSize: 15, fontWeight: '800' },
  statusButton: { height: 58, marginTop: 26, alignItems: 'center', justifyContent: 'center', borderRadius: 8, backgroundColor: '#111827' },
  onlineButton: { backgroundColor: '#b91c1c' },
  statusButtonText: { color: '#ffffff', fontSize: 17, fontWeight: '800' },
  secondaryButton: { height: 48, marginTop: 12, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: '#cbd5e1', borderRadius: 8, backgroundColor: '#ffffff' },
  secondaryButtonText: { fontWeight: '800', color: '#111827' },
  info: { marginTop: 24, padding: 16, borderWidth: 1, borderColor: '#cbd5e1', borderRadius: 8, backgroundColor: '#ffffff' },
  infoTitle: { fontWeight: '800', color: '#0f172a' },
  infoText: { marginTop: 6, color: '#64748b' },
});
