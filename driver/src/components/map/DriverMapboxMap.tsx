import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import Mapbox, { Camera as MapboxCamera } from '@rnmapbox/maps';
import { useEffect, useMemo, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { fetchRoute, RouteGeometry } from '../../services/api';
import { Coords } from '../../types/order';
import { DriverRouteLine } from './DriverRouteLine';

const mapboxAccessToken = process.env.EXPO_PUBLIC_MAPBOX_ACCESS_TOKEN;
export const DRIVER_MAP_STYLE_URL = Mapbox.StyleURL.Light;

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
  const [toPickupGeometry, setToPickupGeometry] = useState<RouteGeometry | null>(null);
  const [toDestinationGeometry, setToDestinationGeometry] = useState<RouteGeometry | null>(null);
  const driver = driverPosition ?? TASHKENT_CENTER;

  const cameraCenter = useMemo(() => {
    const points = [driver, pickup, destination];
    const lat = points.reduce((sum, point) => sum + point.lat, 0) / points.length;
    const lng = points.reduce((sum, point) => sum + point.lng, 0) / points.length;

    return [lng, lat] as [number, number];
  }, [destination, driver, pickup]);

  useEffect(() => {
    if (mapboxAccessToken) {
      void Mapbox.setAccessToken(mapboxAccessToken);
    }
  }, []);

  useEffect(() => {
    let isActive = true;

    async function loadRoutes() {
      const routeRequests: Promise<void>[] = [];

      if (showToPickupRoute && driverPosition) {
        routeRequests.push(
          fetchRoute({
            destinationLat: pickup.lat,
            destinationLng: pickup.lng,
            pickupLat: driverPosition.lat,
            pickupLng: driverPosition.lng,
          })
            .then((route) => {
              if (isActive) {
                setToPickupGeometry(route.geometry);
              }
            })
            .catch((error) => {
              console.warn(error);
              if (isActive) {
                setToPickupGeometry(null);
              }
            }),
        );
      } else {
        setToPickupGeometry(null);
      }

      if (showToDestinationRoute) {
        routeRequests.push(
          fetchRoute({
            destinationLat: destination.lat,
            destinationLng: destination.lng,
            pickupLat: pickup.lat,
            pickupLng: pickup.lng,
          })
            .then((route) => {
              if (isActive) {
                setToDestinationGeometry(route.geometry);
              }
            })
            .catch((error) => {
              console.warn(error);
              if (isActive) {
                setToDestinationGeometry(null);
              }
            }),
        );
      } else {
        setToDestinationGeometry(null);
      }

      await Promise.all(routeRequests);
    }

    void loadRoutes();

    return () => {
      isActive = false;
    };
  }, [destination, driverPosition, pickup, showToDestinationRoute, showToPickupRoute]);

  if (!mapboxAccessToken) {
    return (
      <View style={styles.errorContainer}>
        <View style={styles.errorCard}>
          <Text style={styles.errorTitle}>Mapbox token не настроен</Text>
          <Text style={styles.errorText}>
            Добавьте EXPO_PUBLIC_MAPBOX_ACCESS_TOKEN в driver/.env и перезапустите Metro.
          </Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Mapbox.MapView
        attributionEnabled={false}
        compassEnabled={false}
        logoEnabled={false}
        scaleBarEnabled={false}
        style={StyleSheet.absoluteFill}
        styleURL={DRIVER_MAP_STYLE_URL}
      >
        <MapboxCamera
          animationDuration={450}
          centerCoordinate={cameraCenter}
          zoomLevel={12.5}
        />
        <Mapbox.UserLocation visible />

        {showToPickupRoute && driverPosition ? (
          <DriverRouteLine
            coordinates={toPickupGeometry?.coordinates}
            fromLat={driverPosition.lat}
            fromLng={driverPosition.lng}
            id="driver-to-pickup"
            lineColor="#111827"
            toLat={pickup.lat}
            toLng={pickup.lng}
          />
        ) : null}

        {showToDestinationRoute ? (
          <DriverRouteLine
            coordinates={toDestinationGeometry?.coordinates}
            fromLat={pickup.lat}
            fromLng={pickup.lng}
            id="pickup-to-destination"
            lineColor="#FFD400"
            toLat={destination.lat}
            toLng={destination.lng}
          />
        ) : null}

        {driverPosition ? (
          <Mapbox.PointAnnotation
            coordinate={[driverPosition.lng, driverPosition.lat]}
            id="driver-marker"
            title="Driver"
          >
            <View style={styles.driverMarker}>
              <MaterialCommunityIcons color="#ffffff" name="car" size={18} />
            </View>
          </Mapbox.PointAnnotation>
        ) : null}

        <Mapbox.PointAnnotation
          coordinate={[pickup.lng, pickup.lat]}
          id="pickup-marker"
          title="Pickup"
        >
          <View style={styles.pickupMarker}>
            <Ionicons color="#111827" name="person" size={17} />
          </View>
        </Mapbox.PointAnnotation>

        <Mapbox.PointAnnotation
          coordinate={[destination.lng, destination.lat]}
          id="destination-marker"
          title="Destination"
        >
          <View style={styles.destinationMarker}>
            <Ionicons color="#111827" name="flag" size={17} />
          </View>
        </Mapbox.PointAnnotation>
      </Mapbox.MapView>
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
  errorContainer: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#eef2f6',
    padding: 24,
  },
  errorCard: {
    width: '100%',
    maxWidth: 340,
    borderWidth: 1,
    borderColor: 'rgba(17,17,17,0.08)',
    borderRadius: 24,
    padding: 18,
    backgroundColor: 'rgba(255,255,255,0.9)',
    shadowColor: '#101828',
    shadowOffset: { width: 0, height: 16 },
    shadowOpacity: 0.14,
    shadowRadius: 28,
    elevation: 10,
  },
  errorTitle: {
    color: '#111827',
    fontSize: 18,
    fontWeight: '900',
  },
  errorText: {
    marginTop: 8,
    color: '#64748b',
    fontSize: 14,
    fontWeight: '700',
    lineHeight: 20,
  },
  driverMarker: {
    width: 38,
    height: 38,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 3,
    borderColor: '#ffffff',
    borderRadius: 19,
    backgroundColor: '#111827',
    shadowColor: '#101828',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.18,
    shadowRadius: 18,
    elevation: 8,
  },
  pickupMarker: {
    width: 38,
    height: 38,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 3,
    borderColor: '#ffffff',
    borderRadius: 19,
    backgroundColor: '#22c55e',
    shadowColor: '#101828',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.16,
    shadowRadius: 18,
    elevation: 8,
  },
  destinationMarker: {
    width: 38,
    height: 38,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 3,
    borderColor: '#ffffff',
    borderRadius: 19,
    backgroundColor: '#FFD400',
    shadowColor: '#101828',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.16,
    shadowRadius: 18,
    elevation: 8,
  },
});
