import { Pressable, StyleSheet, Text, View } from 'react-native';
import { TariffClass } from '../types/order';

const tariffs: Array<{ id: TariffClass; title: string; price: number }> = [
  { id: 'ECONOMY', title: 'Эконом', price: 18000 },
  { id: 'COMFORT', title: 'Комфорт', price: 26000 },
  { id: 'PREMIUM', title: 'Премиум', price: 42000 },
];

interface TariffScreenProps {
  onTariffSelected: (tariff: TariffClass, price: number) => void;
}

export function TariffScreen({ onTariffSelected }: TariffScreenProps) {
  return (
    <View style={styles.screen}>
      <Text style={styles.title}>Выбор тарифа</Text>

      {tariffs.map((tariff) => (
        <Pressable
          key={tariff.id}
          onPress={() => onTariffSelected(tariff.id, tariff.price)}
          style={styles.tariffCard}
        >
          <View>
            <Text style={styles.tariffTitle}>{tariff.title}</Text>
            <Text style={styles.tariffMeta}>3-5 минут</Text>
          </View>
          <Text style={styles.price}>{tariff.price.toLocaleString()} сум</Text>
        </Pressable>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    padding: 20,
    backgroundColor: '#f8fafc',
  },
  title: {
    marginTop: 32,
    marginBottom: 20,
    fontSize: 28,
    fontWeight: '800',
    color: '#111827',
  },
  tariffCard: {
    minHeight: 82,
    marginBottom: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 8,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#ffffff',
  },
  tariffTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#111827',
  },
  tariffMeta: {
    marginTop: 4,
    color: '#64748b',
  },
  price: {
    fontSize: 16,
    fontWeight: '800',
    color: '#0f172a',
  },
});
