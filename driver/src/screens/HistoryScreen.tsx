import { useEffect, useState } from 'react';
import { FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import { fetchDriverRideHistory } from '../services/api';
import { RideHistoryFilter, RideHistoryItem } from '../types/order';
import { OrderStatus } from '../types/orderStatus';

const filters: RideHistoryFilter[] = ['completed', 'active', 'cancelled'];

interface HistoryScreenProps {
  accessToken: string;
  onBack: () => void;
}

export function HistoryScreen({ accessToken, onBack }: HistoryScreenProps) {
  const [filter, setFilter] = useState<RideHistoryFilter>('completed');
  const [rides, setRides] = useState<RideHistoryItem[]>([]);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(false);
  const [error, setError] = useState<string>();

  useEffect(() => {
    let cancelled = false;

    async function loadHistory() {
      setLoading(true);
      setError(undefined);
      setPage(1);
      setHasMore(false);

      try {
        const result = await fetchDriverRideHistory(accessToken, filter, 1, 20);

        if (!cancelled) {
          setRides(result.data);
          setPage(result.page);
          setHasMore(result.hasMore);
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

  async function loadMoreRides() {
    if (loading || loadingMore || !hasMore) {
      return;
    }

    setLoadingMore(true);
    try {
      const result = await fetchDriverRideHistory(accessToken, filter, page + 1, 20);
      setRides((current) => [...current, ...result.data]);
      setPage(result.page);
      setHasMore(result.hasMore);
    } catch (nextError) {
      console.warn(nextError);
      setError('Не удалось загрузить следующую страницу');
    } finally {
      setLoadingMore(false);
    }
  }

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
        ListFooterComponent={loadingMore ? <Text style={styles.meta}>Загружаем ещё...</Text> : null}
        onEndReached={() => {
          void loadMoreRides();
        }}
        onEndReachedThreshold={0.3}
        renderItem={({ item }) => (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>{item.pickupAddress}</Text>
            <Text style={styles.route}>{item.dropoffAddress}</Text>
            {item.createdAt && <Text style={styles.meta}>{formatDate(item.createdAt)}</Text>}
            <View style={styles.row}>
              <Text style={styles.status}>{statusLabel(item.status)}</Text>
              <Text style={styles.price}>{item.price.toLocaleString()} сум</Text>
            </View>
            {item.paymentStatus && <Text style={styles.meta}>Оплата: {paymentLabel(item.paymentStatus)}</Text>}
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
  if (status === OrderStatus.COMPLETED) return 'Завершён';
  if (status === OrderStatus.CANCELLED) return 'Отменён';
  if (status === OrderStatus.IN_PROGRESS) return 'В поездке';
  if (status === OrderStatus.ARRIVING) return 'На месте';
  if (status === OrderStatus.ACCEPTED) return 'Принят';
  return status;
}

function paymentLabel(status: string) {
  if (status === 'PENDING') return 'ожидает оплаты';
  if (status === 'PAID') return 'оплачено';
  if (status === 'FAILED') return 'ошибка';
  return status;
}

function formatDate(value: string) {
  return new Date(value).toLocaleString('ru-RU', {
    day: '2-digit',
    month: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
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
