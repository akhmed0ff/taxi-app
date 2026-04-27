import { useEffect, useState } from 'react';
import { FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import { fetchDriverRideHistory } from '../services/api';
import { RideHistoryFilter, RideHistoryItem } from '../types/order';

const filters: RideHistoryFilter[] = ['completed', 'active', 'cancelled'];

interface HistoryScreenProps {
  accessToken: string;
  onBack: () => void;
}

export function HistoryScreen({ accessToken, onBack }: HistoryScreenProps) {
  const [filter, setFilter] = useState<RideHistoryFilter>('completed');
  const [rides, setRides] = useState<RideHistoryItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string>();

  useEffect(() => {
    let cancelled = false;

    async function loadHistory() {
      setLoading(true);
      setError(undefined);

      try {
        const nextRides = await fetchDriverRideHistory(accessToken, filter);

        if (!cancelled) {
          setRides(nextRides);
        }
      } catch (nextError) {
        if (!cancelled) {
          console.warn(nextError);
          setError('Не удалось загрузить историю');
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    void loadHistory();

    return () => {
      cancelled = true;
    };
  }, [accessToken, filter]);

  return (
    <View style={styles.screen}>
      <View style={styles.header}>
        <Pressable onPress={onBack} style={styles.secondaryButton}>
          <Text style={styles.secondaryText}>Назад</Text>
        </Pressable>
        <Text style={styles.title}>Выполненные заказы</Text>
      </View>

      <View style={styles.filters}>
        {filters.map((nextFilter) => (
          <Pressable
            key={nextFilter}
            onPress={() => setFilter(nextFilter)}
            style={[styles.filterButton, filter === nextFilter && styles.activeFilter]}
          >
            <Text style={[styles.filterText, filter === nextFilter && styles.activeFilterText]}>
              {filterLabel(nextFilter)}
            </Text>
          </Pressable>
        ))}
      </View>

      {error && <Text style={styles.error}>{error}</Text>}
      {loading && <Text style={styles.meta}>Загрузка...</Text>}

      <FlatList
        contentContainerStyle={styles.list}
        data={rides}
        keyExtractor={(item) => item.id}
        ListEmptyComponent={!loading ? <Text style={styles.meta}>Заказов пока нет</Text> : null}
        renderItem={({ item }) => (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>{item.pickupAddress}</Text>
            <Text style={styles.route}>{item.dropoffAddress}</Text>
            <View style={styles.row}>
              <Text style={styles.status}>{statusLabel(item.status)}</Text>
              <Text style={styles.price}>{item.price.toLocaleString()} сум</Text>
            </View>
            {item.passengerName && <Text style={styles.meta}>Пассажир: {item.passengerName}</Text>}
          </View>
        )}
      />
    </View>
  );
}

function filterLabel(filter: RideHistoryFilter) {
  if (filter === 'active') return 'Активные';
  if (filter === 'cancelled') return 'Отменённые';
  return 'Завершённые';
}

function statusLabel(status: RideHistoryItem['status']) {
  if (status === 'COMPLETED') return 'Завершён';
  if (status === 'CANCELLED') return 'Отменён';
  if (status === 'IN_PROGRESS') return 'В поездке';
  if (status === 'DRIVER_ARRIVED') return 'На месте';
  if (status === 'ACCEPTED') return 'Принят';
  return status;
}

const styles = StyleSheet.create({
  screen: { flex: 1, padding: 16, backgroundColor: '#f8fafc' },
  header: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  title: { flex: 1, fontSize: 24, fontWeight: '900', color: '#111827' },
  secondaryButton: { height: 40, paddingHorizontal: 14, alignItems: 'center', justifyContent: 'center', borderRadius: 8, backgroundColor: '#e5e7eb' },
  secondaryText: { fontWeight: '800', color: '#111827' },
  filters: { flexDirection: 'row', gap: 8, marginTop: 18 },
  filterButton: { flex: 1, height: 42, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: '#cbd5e1', borderRadius: 8, backgroundColor: '#ffffff' },
  activeFilter: { backgroundColor: '#111827', borderColor: '#111827' },
  filterText: { fontWeight: '800', color: '#334155' },
  activeFilterText: { color: '#ffffff' },
  list: { paddingTop: 14, gap: 10 },
  card: { padding: 14, borderWidth: 1, borderColor: '#e2e8f0', borderRadius: 8, backgroundColor: '#ffffff' },
  cardTitle: { fontSize: 16, fontWeight: '900', color: '#111827' },
  route: { marginTop: 6, color: '#64748b' },
  row: { marginTop: 12, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  status: { fontWeight: '800', color: '#334155' },
  price: { fontWeight: '900', color: '#111827' },
  meta: { marginTop: 8, color: '#64748b' },
  error: { marginTop: 16, color: '#b91c1c', fontWeight: '800' },
});
