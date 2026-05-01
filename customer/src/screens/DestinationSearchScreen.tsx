import { Ionicons } from '@expo/vector-icons';
import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import {
  DestinationSearchResult,
  isNetworkError,
  searchDestinationAddresses,
} from '../services/api';

interface DestinationSearchScreenProps {
  initialQuery?: string;
  onBack: () => void;
  onSelect: (result: DestinationSearchResult) => void;
}

export function DestinationSearchScreen({
  initialQuery = '',
  onBack,
  onSelect,
}: DestinationSearchScreenProps) {
  const [query, setQuery] = useState(initialQuery);
  const [results, setResults] = useState<DestinationSearchResult[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string>();

  useEffect(() => {
    const normalizedQuery = query.trim();

    if (normalizedQuery.length < 2) {
      setResults([]);
      setError(undefined);
      setIsLoading(false);
      return;
    }

    let isActive = true;
    const timer = setTimeout(() => {
      setIsLoading(true);
      setError(undefined);

      void searchDestinationAddresses(normalizedQuery)
        .then((nextResults) => {
          if (!isActive) {
            return;
          }

          setResults(nextResults);
        })
        .catch((nextError) => {
          if (!isActive) {
            return;
          }

          console.warn(nextError);
          setResults([]);
          setError(
            isNetworkError(nextError)
              ? 'Нет интернета. Проверьте подключение и попробуйте снова.'
              : 'Не удалось найти адрес',
          );
        })
        .finally(() => {
          if (isActive) {
            setIsLoading(false);
          }
        });
    }, 500);

    return () => {
      isActive = false;
      clearTimeout(timer);
    };
  }, [query]);

  return (
    <View style={styles.screen}>
      <View style={styles.header}>
        <Pressable onPress={onBack} style={styles.backButton}>
          <Ionicons color="#111111" name="arrow-back" size={22} />
        </Pressable>
        <Text style={styles.title}>Куда поедем?</Text>
      </View>

      <View style={styles.searchBox}>
        <Ionicons color="#667085" name="search" size={18} />
        <TextInput
          autoFocus
          onChangeText={setQuery}
          placeholder="Введите адрес"
          placeholderTextColor="#98A2B3"
          style={styles.input}
          value={query}
        />
      </View>

      {isLoading ? (
        <View style={styles.stateBox}>
          <ActivityIndicator color="#111111" />
          <Text style={styles.stateText}>Ищем адрес...</Text>
        </View>
      ) : null}

      {error ? (
        <View style={styles.stateBox}>
          <Text style={styles.errorText}>{error}</Text>
        </View>
      ) : null}

      {!isLoading && !error && query.trim().length < 2 ? (
        <View style={styles.stateBox}>
          <Text style={styles.stateText}>Введите минимум 2 символа</Text>
        </View>
      ) : null}

      {!isLoading && !error && query.trim().length >= 2 && results.length === 0 ? (
        <View style={styles.stateBox}>
          <Text style={styles.stateText}>Ничего не найдено</Text>
        </View>
      ) : null}

      <FlatList
        contentContainerStyle={styles.listContent}
        data={results}
        keyExtractor={(item) => `${item.lat}:${item.lng}:${item.fullAddress}`}
        keyboardShouldPersistTaps="handled"
        renderItem={({ item }) => (
          <Pressable
            onPress={() => onSelect(item)}
            style={({ pressed }) => [styles.resultCard, pressed && styles.resultCardPressed]}
          >
            <View style={styles.resultIcon}>
              <Ionicons color="#111111" name="location-outline" size={18} />
            </View>
            <View style={styles.resultTextWrap}>
              <Text numberOfLines={2} style={styles.resultAddress}>
                {item.title}
              </Text>
              <Text numberOfLines={2} style={styles.resultSubtitle}>
                {item.subtitle || item.fullAddress}
              </Text>
              <Text style={styles.resultMeta}>
                {item.lat.toFixed(4)}, {item.lng.toFixed(4)}
              </Text>
            </View>
          </Pressable>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: '#F6F7F9',
    paddingTop: 24,
    paddingHorizontal: 16,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  backButton: {
    width: 42,
    height: 42,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 21,
    backgroundColor: '#FFFFFF',
  },
  title: {
    color: '#111111',
    fontSize: 22,
    fontWeight: '900',
  },
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginTop: 18,
    borderWidth: 1,
    borderColor: '#E4E7EC',
    borderRadius: 18,
    paddingHorizontal: 14,
    paddingVertical: 12,
    backgroundColor: '#FFFFFF',
  },
  input: {
    flex: 1,
    color: '#111111',
    fontSize: 16,
    fontWeight: '700',
    padding: 0,
  },
  stateBox: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 18,
    gap: 10,
  },
  stateText: {
    color: '#667085',
    fontSize: 14,
    fontWeight: '700',
  },
  errorText: {
    color: '#B42318',
    fontSize: 14,
    fontWeight: '800',
    textAlign: 'center',
  },
  listContent: {
    paddingTop: 8,
    paddingBottom: 24,
    gap: 10,
  },
  resultCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    borderRadius: 20,
    padding: 14,
    backgroundColor: '#FFFFFF',
  },
  resultCardPressed: {
    opacity: 0.8,
  },
  resultIcon: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 18,
    backgroundColor: '#FFD400',
  },
  resultTextWrap: {
    flex: 1,
    minWidth: 0,
  },
  resultAddress: {
    color: '#111111',
    fontSize: 15,
    fontWeight: '800',
    lineHeight: 20,
  },
  resultSubtitle: {
    marginTop: 4,
    color: '#667085',
    fontSize: 13,
    fontWeight: '700',
    lineHeight: 18,
  },
  resultMeta: {
    marginTop: 6,
    color: '#667085',
    fontSize: 12,
    fontWeight: '700',
  },
});
