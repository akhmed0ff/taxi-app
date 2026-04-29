import { StyleSheet, Text, View } from 'react-native';

interface MapPoint {
  label: string;
  lat?: number;
  lng?: number;
  address?: string;
}

interface MapPlaceholderProps {
  title?: string;
  subtitle?: string;
  points?: MapPoint[];
}

export function MapPlaceholder({
  points = [],
  subtitle = 'ANGREN TAXI',
  title = 'Карта временно отключена',
}: MapPlaceholderProps) {
  return (
    <View style={styles.root}>
      <Text style={styles.brand}>ANGREN TAXI</Text>
      <Text style={styles.title}>{title}</Text>
      <Text style={styles.subtitle}>{subtitle}</Text>
      <View style={styles.points}>
        {points
          .filter((point) => point.lat !== undefined && point.lng !== undefined)
          .map((point) => (
            <View key={point.label} style={styles.pointRow}>
              <Text style={styles.pointLabel}>{point.label}</Text>
              <Text style={styles.pointValue}>
                {point.lat?.toFixed(5)}, {point.lng?.toFixed(5)}
              </Text>
              {point.address ? (
                <Text style={styles.address}>{point.address}</Text>
              ) : null}
            </View>
          ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    justifyContent: 'center',
    padding: 18,
    backgroundColor: '#dcfce7',
  },
  brand: {
    color: '#166534',
    fontSize: 13,
    fontWeight: '900',
  },
  title: {
    marginTop: 8,
    color: '#0f172a',
    fontSize: 24,
    fontWeight: '900',
  },
  subtitle: {
    marginTop: 6,
    color: '#334155',
    fontWeight: '800',
  },
  points: {
    gap: 10,
    marginTop: 18,
  },
  pointRow: {
    padding: 12,
    borderRadius: 8,
    backgroundColor: 'rgba(255,255,255,0.88)',
  },
  pointLabel: {
    color: '#0f172a',
    fontWeight: '900',
  },
  pointValue: {
    marginTop: 4,
    color: '#166534',
    fontWeight: '800',
  },
  address: {
    marginTop: 3,
    color: '#475569',
    fontWeight: '700',
  },
});
