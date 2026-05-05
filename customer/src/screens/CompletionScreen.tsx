import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { t } from '../i18n';
import { Order } from '../types/order';

interface CompletionScreenProps {
  order: Order;
  onRestart: () => void;
  onRate: (rating: 1 | 2 | 3 | 4 | 5) => Promise<void>;
}

export function CompletionScreen({ onRate, order, onRestart }: CompletionScreenProps) {
  const [selectedRating, setSelectedRating] = useState<1 | 2 | 3 | 4 | 5>();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [ratingError, setRatingError] = useState<string>();

  async function handleRatingPress(rating: 1 | 2 | 3 | 4 | 5) {
    if (isSubmitting || selectedRating) {
      return;
    }

    setIsSubmitting(true);
    setRatingError(undefined);

    try {
      await onRate(rating);
      setSelectedRating(rating);
    } catch (error) {
      console.warn(error);
      setRatingError('Не удалось отправить оценку');
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <View style={styles.screen}>
      <Text style={styles.title}>{t('tripCompleted')}</Text>
      <Text style={styles.price}>{order.price.toLocaleString()} {t('som')}</Text>
      <Text style={styles.rating}>{selectedRating ? 'Спасибо за оценку' : 'Оцените поездку'}</Text>
      <View style={styles.stars}>
        {([1, 2, 3, 4, 5] as const).map((rating) => (
          <Pressable
            disabled={isSubmitting || Boolean(selectedRating)}
            key={rating}
            onPress={() => void handleRatingPress(rating)}
            style={styles.starButton}
          >
            <Text style={[styles.star, selectedRating && rating <= selectedRating && styles.starSelected]}>
              ★
            </Text>
          </Pressable>
        ))}
      </View>
      {ratingError ? <Text style={styles.ratingError}>{ratingError}</Text> : null}
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
  stars: { flexDirection: 'row', gap: 8, marginTop: 14 },
  starButton: { paddingVertical: 4 },
  star: { fontSize: 42, color: '#cbd5e1' },
  starSelected: { color: '#f59e0b' },
  ratingError: { marginTop: 8, color: '#dc2626', fontWeight: '700' },
  primaryButton: { height: 52, marginTop: 26, alignItems: 'center', justifyContent: 'center', borderRadius: 8, backgroundColor: '#111827' },
  primaryButtonText: { color: '#ffffff', fontWeight: '800' },
});
