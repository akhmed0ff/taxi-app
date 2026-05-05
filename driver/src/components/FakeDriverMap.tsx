import { StyleSheet, Text, View } from 'react-native';
import { Coords } from '../types/order';

interface FakeDriverMapProps {
  driverPosition?: Coords;
  pickup?: Coords;
  destination?: Coords;
}

export function FakeDriverMap({ destination, driverPosition, pickup }: FakeDriverMapProps) {
  return (
    <View pointerEvents="none" style={styles.root}>
      <View style={styles.blocks}>
        <View style={[styles.block, { top: '8%', left: '6%', width: '38%', height: '28%' }]} />
        <View style={[styles.block, { top: '12%', right: '8%', width: '42%', height: '22%' }]} />
        <View style={[styles.block, { bottom: '18%', left: '10%', width: '35%', height: '24%' }]} />
        <View style={[styles.block, { bottom: '22%', right: '6%', width: '40%', height: '30%' }]} />
      </View>

      <View style={[styles.road, styles.roadMain, styles.roadH, { top: '26%' }]} />
      <View style={[styles.road, styles.roadSecondary, styles.roadH, { top: '52%' }]} />
      <View style={[styles.road, styles.roadMain, styles.roadH, { top: '78%' }]} />

      <View style={[styles.road, styles.roadSecondary, styles.roadV, { left: '22%' }]} />
      <View style={[styles.road, styles.roadMain, styles.roadV, { left: '58%' }]} />

      <View style={[styles.road, styles.roadSecondary, styles.roadDiagonal]} />
      <View style={[styles.road, styles.roadMain, styles.roadDiagonal2]} />

      <View style={[styles.intersection, { top: '24%', left: '56%' }]} />
      <View style={[styles.intersection, { top: '50%', left: '20%' }]} />

      <Marker label="Водитель" style={styles.driverMarker} visible={Boolean(driverPosition)} />
      <Marker label="Подача" style={styles.pickupMarker} visible={Boolean(pickup)} />
      <Marker label="Куда" style={styles.destinationMarker} visible={Boolean(destination)} />

      <View pointerEvents="none" style={styles.labelWrap}>
        <View style={styles.card}>
          <Text style={styles.title}>Карта временно отключена</Text>
          <Text style={styles.subtitle}>Продолжаем разработку заказа</Text>
        </View>
      </View>
    </View>
  );
}

function Marker({
  label,
  style,
  visible,
}: {
  label: string;
  style: object;
  visible: boolean;
}) {
  if (!visible) {
    return null;
  }

  return (
    <View style={[styles.marker, style as object]}>
      <Text style={styles.markerText}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#EEF2F6',
    overflow: 'hidden',
  },
  blocks: {
    ...StyleSheet.absoluteFillObject,
  },
  block: {
    position: 'absolute',
    borderRadius: 18,
    backgroundColor: 'rgba(17, 24, 39, 0.04)',
    borderWidth: 1,
    borderColor: 'rgba(17, 24, 39, 0.06)',
  },
  road: {
    position: 'absolute',
    opacity: 0.9,
  },
  roadH: {
    left: '-10%',
    right: '-10%',
    height: 10,
    borderRadius: 999,
  },
  roadV: {
    top: '-10%',
    bottom: '-10%',
    width: 10,
    borderRadius: 999,
  },
  roadMain: {
    backgroundColor: 'rgba(17, 24, 39, 0.10)',
  },
  roadSecondary: {
    backgroundColor: 'rgba(17, 24, 39, 0.06)',
  },
  roadDiagonal: {
    left: '-30%',
    top: '60%',
    width: '160%',
    height: 10,
    borderRadius: 999,
    transform: [{ rotate: '-18deg' }],
    backgroundColor: 'rgba(17, 24, 39, 0.06)',
  },
  roadDiagonal2: {
    left: '-40%',
    top: '34%',
    width: '170%',
    height: 10,
    borderRadius: 999,
    transform: [{ rotate: '12deg' }],
    backgroundColor: 'rgba(17, 24, 39, 0.10)',
  },
  intersection: {
    position: 'absolute',
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: 'rgba(17, 24, 39, 0.18)',
  },
  marker: {
    position: 'absolute',
    minWidth: 82,
    height: 28,
    paddingHorizontal: 10,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 999,
    borderWidth: 1,
    borderColor: 'rgba(17,24,39,0.12)',
    backgroundColor: 'rgba(255,255,255,0.9)',
  },
  markerText: {
    fontSize: 12,
    fontWeight: '900',
    color: '#111827',
  },
  driverMarker: {
    top: '56%',
    left: '20%',
  },
  pickupMarker: {
    top: '46%',
    left: '52%',
  },
  destinationMarker: {
    top: '30%',
    left: '64%',
  },
  labelWrap: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  card: {
    width: '100%',
    maxWidth: 340,
    borderRadius: 24,
    padding: 18,
    borderWidth: 1,
    borderColor: 'rgba(17, 24, 39, 0.08)',
    backgroundColor: 'rgba(255,255,255,0.86)',
  },
  title: {
    color: '#111827',
    fontSize: 18,
    fontWeight: '900',
  },
  subtitle: {
    marginTop: 6,
    color: '#64748b',
    fontSize: 14,
    fontWeight: '700',
  },
});

