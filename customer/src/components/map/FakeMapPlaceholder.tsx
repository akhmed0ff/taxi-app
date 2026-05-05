import { StyleSheet, Text, View } from 'react-native';

type FakeMapPlaceholderProps = {
  /** Если false — только «карта» без центральной подсказки (удобно для главного экрана). */
  showCenterNotice?: boolean;
};

export function FakeMapPlaceholder({ showCenterNotice = true }: FakeMapPlaceholderProps) {
  return (
    <View style={styles.root} pointerEvents="none">
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

      {showCenterNotice ? (
        <View style={styles.labelWrap} pointerEvents="none">
          <View style={styles.card}>
            <Text style={styles.title}>Карта временно отключена</Text>
            <Text style={styles.subtitle}>Продолжаем разработку</Text>
          </View>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 0,
    elevation: 0,
    backgroundColor: '#EEF2F6',
    overflow: 'hidden',
  },
  blocks: {
    ...StyleSheet.absoluteFillObject,
  },
  block: {
    position: 'absolute',
    borderRadius: 10,
    backgroundColor: 'rgba(226, 232, 240, 0.55)',
    borderWidth: 1,
    borderColor: 'rgba(148, 163, 184, 0.12)',
  },
  road: {
    position: 'absolute',
    borderRadius: 3,
  },
  roadMain: {
    backgroundColor: '#C5CCD6',
    shadowColor: '#64748B',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.12,
    shadowRadius: 2,
    elevation: 1,
  },
  roadSecondary: {
    backgroundColor: '#D4DAE3',
  },
  roadH: {
    left: '-8%',
    width: '116%',
    height: 5,
  },
  roadV: {
    top: '-8%',
    width: 5,
    height: '116%',
  },
  roadDiagonal: {
    width: '150%',
    height: 4,
    top: '38%',
    left: '-25%',
    transform: [{ rotate: '-22deg' }],
  },
  roadDiagonal2: {
    width: '130%',
    height: 4,
    top: '64%',
    left: '-15%',
    transform: [{ rotate: '14deg' }],
  },
  intersection: {
    position: 'absolute',
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: 'rgba(197, 204, 214, 0.9)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.6)',
    marginLeft: -5,
    marginTop: -5,
  },
  labelWrap: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 28,
  },
  card: {
    maxWidth: 320,
    width: '100%',
    paddingVertical: 22,
    paddingHorizontal: 24,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.92)',
    borderWidth: 1,
    borderColor: 'rgba(15, 23, 42, 0.06)',
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.08,
    shadowRadius: 24,
    elevation: 6,
  },
  title: {
    color: '#1E293B',
    fontSize: 18,
    fontWeight: '800',
    textAlign: 'center',
    letterSpacing: -0.3,
    lineHeight: 24,
  },
  subtitle: {
    marginTop: 10,
    color: '#64748B',
    fontSize: 15,
    fontWeight: '600',
    textAlign: 'center',
    letterSpacing: -0.2,
    lineHeight: 22,
  },
});
