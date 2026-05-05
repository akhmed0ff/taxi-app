import { useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import { t } from '../i18n';
import { getTariffs, type PublicTariff } from '../services/api';
import { Point, TariffClass } from '../types/order';

interface TariffScreenProps {
  pickup: Point;
  dropoff: Point;
  onTariffSelected: (tariff: TariffClass, price: number) => void;
}

export function TariffScreen({ dropoff, onTariffSelected, pickup }: TariffScreenProps) {
  const distanceKm = calculateDistanceKm(pickup, dropoff);
  const [tariffs, setTariffs] = useState<PublicTariff[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string>();

  useEffect(() => {
    let cancelled = false;

    void (async () => {
      try {
        const list = await getTariffs();
        if (!cancelled) {
          setTariffs(list.filter((row) => row.code !== 'DELIVERY' && row.isActive));
        }
      } catch (e) {
        if (!cancelled) {
          setLoadError(e instanceof Error ? e.message : 'Не удалось загрузить тарифы');
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator color="#111827" size="large" />
        <Text style={styles.loadingText}>{t('tariffSelection')}</Text>
      </View>
    );
  }

  if (loadError || tariffs.length === 0) {
    return (
      <View style={styles.centered}>
        <Text style={styles.errorTitle}>Тарифы недоступны</Text>
        <Text style={styles.errorBody}>{loadError ?? 'Пустой ответ от сервера'}</Text>
      </View>
    );
  }

  return (
    <View style={styles.screen}>
      <Text style={styles.title}>{t('tariffSelection')}</Text>
      <Text style={styles.subtitle}>
        Расчёт для {distanceKm.toFixed(1)} км. Первые {tariffs[0]?.freeWaitingMinutes ?? '—'}{' '}
        мин. ожидания бесплатно (по данным сервера).
      </Text>

      {tariffs.map((tariff) => {
        const breakdown = calculateFareBreakdown(tariff, distanceKm);

        return (
          <Pressable
            key={tariff.id}
            onPress={() => onTariffSelected(tariff.code, breakdown.total)}
            style={styles.tariffCard}
          >
            <View style={styles.tariffHeader}>
              <View>
                <Text style={styles.tariffTitle}>{tariff.title}</Text>
                <Text style={styles.tariffMeta}>
                  Подача {formatSom(tariff.baseFare)} · {formatSom(tariff.pricePerKm)}/км
                  {tariff.pricePer100m != null && Number.isFinite(tariff.pricePer100m)
                    ? ` · ${formatSom(tariff.pricePer100m)}/100 м`
                    : ''}
                </Text>
              </View>
              <Text style={styles.price}>{formatSom(breakdown.total)}</Text>
            </View>

            <View style={styles.breakdown}>
              <BreakdownRow label="Подача" value={breakdown.baseFareAmount} />
              <BreakdownRow label={`${distanceKm.toFixed(1)} км`} value={breakdown.distanceAmount} />
              <BreakdownRow
                label={`Ожидание после ${tariff.freeWaitingMinutes} мин`}
                suffix="/мин"
                value={tariff.waitingPerMinute}
              />
              <BreakdownRow label="Остановки" suffix="/мин" value={tariff.stopPerMinute} />
              <BreakdownRow label="Минимальная цена" value={tariff.minimumFare} />
            </View>
          </Pressable>
        );
      })}
    </View>
  );
}

function BreakdownRow({
  label,
  suffix = '',
  value,
}: {
  label: string;
  suffix?: string;
  value: number;
}) {
  return (
    <View style={styles.breakdownRow}>
      <Text style={styles.breakdownLabel}>{label}</Text>
      <Text style={styles.breakdownValue}>
        {formatSom(value)}
        {suffix}
      </Text>
    </View>
  );
}

function calculateFareBreakdown(tariff: PublicTariff, distanceKm: number) {
  const baseFareAmount = tariff.baseFare;
  const usePer100m =
    tariff.pricePer100m != null && Number.isFinite(tariff.pricePer100m);
  const distanceAmount = usePer100m
    ? Math.round(distanceKm * 10 * tariff.pricePer100m!)
    : Math.round(distanceKm * tariff.pricePerKm);
  const subtotal = baseFareAmount + distanceAmount;
  const total = Math.max(subtotal, tariff.minimumFare);

  return {
    baseFareAmount,
    distanceAmount,
    subtotal,
    total,
  };
}

function calculateDistanceKm(pickup: Point, dropoff: Point) {
  const earthRadiusMeters = 6371000;
  const deltaLat = toRadians(dropoff.lat - pickup.lat);
  const deltaLng = toRadians(dropoff.lng - pickup.lng);
  const startLatRad = toRadians(pickup.lat);
  const endLatRad = toRadians(dropoff.lat);
  const a =
    Math.sin(deltaLat / 2) ** 2 +
    Math.cos(startLatRad) * Math.cos(endLatRad) * Math.sin(deltaLng / 2) ** 2;
  const meters = 2 * earthRadiusMeters * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return Math.max(1, Math.round((meters / 1000) * 10) / 10);
}

function toRadians(value: number) {
  return (value * Math.PI) / 180;
}

function formatSom(value: number) {
  return `${value.toLocaleString('ru-RU')} ${t('som')}`;
}

const styles = StyleSheet.create({
  screen: { flex: 1, padding: 20, backgroundColor: '#f8fafc' },
  centered: {
    flex: 1,
    padding: 24,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f8fafc',
    gap: 12,
  },
  loadingText: { marginTop: 8, color: '#64748b', fontWeight: '700' },
  errorTitle: { fontSize: 18, fontWeight: '900', color: '#111827' },
  errorBody: { textAlign: 'center', color: '#64748b', fontWeight: '600' },
  title: { marginTop: 32, fontSize: 28, fontWeight: '800', color: '#111827' },
  subtitle: { marginTop: 6, marginBottom: 18, color: '#64748b', fontWeight: '700' },
  tariffCard: {
    minHeight: 160,
    marginBottom: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 8,
    backgroundColor: '#ffffff',
  },
  tariffHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 12,
  },
  tariffTitle: { fontSize: 18, fontWeight: '800', color: '#111827' },
  tariffMeta: { marginTop: 4, color: '#64748b' },
  price: { fontSize: 18, fontWeight: '900', color: '#0f172a' },
  breakdown: { marginTop: 14, paddingTop: 10, borderTopWidth: 1, borderTopColor: '#e2e8f0' },
  breakdownRow: {
    minHeight: 26,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  breakdownLabel: { color: '#64748b', fontWeight: '700' },
  breakdownValue: { color: '#111827', fontWeight: '800' },
});
