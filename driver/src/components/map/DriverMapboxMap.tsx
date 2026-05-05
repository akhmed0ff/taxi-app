import { useMemo } from 'react';
import { StyleSheet, View } from 'react-native';
import { Coords } from '../../types/order';
import { FakeMapPlaceholder } from './FakeMapPlaceholder';

const TASHKENT_CENTER: Coords = {
  lat: 41.2995,
  lng: 69.2401,
};

interface DriverMapboxMapProps {
  destination: Coords;
  driverPosition?: Coords;
  pickup: Coords;
  showToDestinationRoute?: boolean;
  showToPickupRoute?: boolean;
}

export function DriverMapboxMap({
  destination,
  driverPosition,
  pickup,
  showToDestinationRoute = true,
  showToPickupRoute = true,
}: DriverMapboxMapProps) {
  const driver = driverPosition ?? TASHKENT_CENTER;

  const cameraCenter = useMemo(() => {
    const points = [driver, pickup, destination];
    const lat = points.reduce((sum, point) => sum + point.lat, 0) / points.length;
    const lng = points.reduce((sum, point) => sum + point.lng, 0) / points.length;

    return [lng, lat] as [number, number];
  }, [destination, driver, pickup]);
  void cameraCenter;
  void showToDestinationRoute;
  void showToPickupRoute;

  return (
    <View style={styles.container}>
      <FakeMapPlaceholder />
      <View pointerEvents="none" style={styles.mapSoftOverlay} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    ...StyleSheet.absoluteFillObject,
  },
  mapSoftOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(255,255,255,0.08)',
  },
});
