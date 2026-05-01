import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import Mapbox, { Camera as MapboxCamera, MapState, type Camera as MapboxCameraRef } from '@rnmapbox/maps';
import * as Location from 'expo-location';
import { useEffect, useRef, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import {
  fetchRoute,
  isNetworkError,
  RouteGeometry,
  RouteResponse,
} from '../../services/api';
import { RouteLine } from './RouteLine';

const mapboxAccessToken = process.env.EXPO_PUBLIC_MAPBOX_ACCESS_TOKEN;
const PASSENGER_MAP_STYLE_URL = Mapbox.StyleURL.Light;

const TASHKENT_CENTER = {
  latitude: 41.2995,
  longitude: 69.2401,
};

interface PassengerMapboxMapProps {
  destinationLat?: number;
  destinationLng?: number;
  initialPickupLat?: number;
  initialPickupLng?: number;
  onPickupChange: (pickup: { pickupLat: number; pickupLng: number }) => void;
  onRouteChange?: (route: RouteResponse | null) => void;
  onRouteErrorChange?: (message?: string) => void;
  onRouteLoadingChange?: (isLoading: boolean) => void;
  showDestinationMarker?: boolean;
  showLocationButton?: boolean;
  showPickupPin?: boolean;
}

export function PassengerMapboxMap({
  destinationLat,
  destinationLng,
  initialPickupLat = TASHKENT_CENTER.latitude,
  initialPickupLng = TASHKENT_CENTER.longitude,
  onPickupChange,
  onRouteChange,
  onRouteErrorChange,
  onRouteLoadingChange,
  showDestinationMarker = false,
  showLocationButton = true,
  showPickupPin = true,
}: PassengerMapboxMapProps) {
  const cameraRef = useRef<MapboxCameraRef>(null);
  const [center, setCenter] = useState({
    latitude: initialPickupLat,
    longitude: initialPickupLng,
  });
  const [routeGeometry, setRouteGeometry] = useState<RouteGeometry | null>(null);

  useEffect(() => {
    if (mapboxAccessToken) {
      void Mapbox.setAccessToken(mapboxAccessToken);
    }
  }, []);

  useEffect(() => {
    setCenter({
      latitude: initialPickupLat,
      longitude: initialPickupLng,
    });
  }, [initialPickupLat, initialPickupLng]);

  useEffect(() => {
    let isActive = true;

    async function loadRoute() {
      if (
        !showDestinationMarker ||
        typeof destinationLat !== 'number' ||
        typeof destinationLng !== 'number'
      ) {
        setRouteGeometry(null);
        onRouteChange?.(null);
        onRouteErrorChange?.(undefined);
        onRouteLoadingChange?.(false);
        return;
      }

      try {
        setRouteGeometry(null);
        onRouteChange?.(null);
        onRouteErrorChange?.(undefined);
        onRouteLoadingChange?.(true);
        const route = await fetchRoute({
          destinationLat,
          destinationLng,
          pickupLat: center.latitude,
          pickupLng: center.longitude,
        });

        if (isActive) {
          setRouteGeometry(route.geometry);
          onRouteChange?.(route);
          onRouteErrorChange?.(undefined);
        }
      } catch (error) {
        console.warn(error);
        if (isActive) {
          setRouteGeometry(null);
          onRouteChange?.(null);
          onRouteErrorChange?.(
            isNetworkError(error)
              ? 'Нет интернета. Маршрут и цена уточняются.'
              : 'Не удалось построить маршрут. Цена уточняется.',
          );
        }
      } finally {
        if (isActive) {
          onRouteLoadingChange?.(false);
        }
      }
    }

    void loadRoute();

    return () => {
      isActive = false;
    };
  }, [
    center.latitude,
    center.longitude,
    destinationLat,
    destinationLng,
    onRouteChange,
    onRouteErrorChange,
    onRouteLoadingChange,
    showDestinationMarker,
  ]);

  function updatePickup(latitude: number, longitude: number) {
    setCenter({ latitude, longitude });
    onPickupChange({ pickupLat: latitude, pickupLng: longitude });
  }

  function handleMapIdle(state: MapState) {
    const [longitude, latitude] = state.properties.center;

    if (typeof latitude === 'number' && typeof longitude === 'number') {
      updatePickup(latitude, longitude);
    }
  }

  async function moveToUserLocation() {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();

      if (status !== 'granted') {
        return;
      }

      const location = await Location.getCurrentPositionAsync({});
      const nextCenter = {
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
      };

      updatePickup(nextCenter.latitude, nextCenter.longitude);
      cameraRef.current?.setCamera({
        animationDuration: 450,
        centerCoordinate: [nextCenter.longitude, nextCenter.latitude],
        zoomLevel: 14,
      });
    } catch (error) {
      console.warn(error);
    }
  }

  if (!mapboxAccessToken) {
    return (
      <View style={styles.errorContainer}>
        <View style={styles.errorCard}>
          <Text style={styles.errorTitle}>Mapbox token не настроен</Text>
          <Text style={styles.errorText}>
            Добавьте EXPO_PUBLIC_MAPBOX_ACCESS_TOKEN в customer/.env и перезапустите Metro.
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
        onMapIdle={handleMapIdle}
        scaleBarEnabled={false}
        style={StyleSheet.absoluteFill}
        styleURL={PASSENGER_MAP_STYLE_URL}
      >
        <MapboxCamera
          ref={cameraRef}
          animationDuration={450}
          centerCoordinate={[center.longitude, center.latitude]}
          zoomLevel={14}
        />
        <Mapbox.UserLocation visible />
        {showDestinationMarker && typeof destinationLat === 'number' && typeof destinationLng === 'number' ? (
          <RouteLine
            destinationLat={destinationLat}
            destinationLng={destinationLng}
            pickupLat={center.latitude}
            pickupLng={center.longitude}
            routeCoordinates={routeGeometry?.coordinates}
          />
        ) : null}
        {showDestinationMarker && typeof destinationLat === 'number' && typeof destinationLng === 'number' ? (
          <Mapbox.PointAnnotation
            coordinate={[destinationLng, destinationLat]}
            id="destination-marker"
            title="Куда"
          >
            <View style={styles.destinationMarker}>
              <Ionicons color="#111111" name="flag" size={18} />
            </View>
          </Mapbox.PointAnnotation>
        ) : null}
      </Mapbox.MapView>

      <View pointerEvents="none" style={styles.mapSoftOverlay} />

      {showPickupPin ? (
      <View pointerEvents="none" style={styles.pickupPin}>
        <View style={styles.pinCircle}>
          <Ionicons color="#111111" name="location-sharp" size={34} />
        </View>
        <View style={styles.pinStem} />
      </View>
      ) : null}

      {showLocationButton ? (
      <Pressable
        accessibilityLabel="Моя геолокация"
        onPress={moveToUserLocation}
        style={({ pressed }) => [styles.locationButton, pressed && styles.locationButtonPressed]}
      >
        <MaterialCommunityIcons color="#111111" name="crosshairs-gps" size={22} />
        <Text style={styles.locationButtonText}>моя геолокация</Text>
      </Pressable>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    ...StyleSheet.absoluteFillObject,
  },
  mapSoftOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(255,255,255,0.1)',
  },
  errorContainer: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#EEF2F6',
    padding: 24,
  },
  errorCard: {
    width: '100%',
    maxWidth: 340,
    borderWidth: 1,
    borderColor: 'rgba(17,17,17,0.08)',
    borderRadius: 24,
    padding: 18,
    backgroundColor: 'rgba(255,255,255,0.86)',
    shadowColor: '#101828',
    shadowOffset: { width: 0, height: 16 },
    shadowOpacity: 0.14,
    shadowRadius: 28,
    elevation: 10,
  },
  errorTitle: {
    color: '#111111',
    fontSize: 18,
    fontWeight: '900',
  },
  errorText: {
    marginTop: 8,
    color: '#667085',
    fontSize: 14,
    fontWeight: '700',
    lineHeight: 20,
  },
  locationButton: {
    position: 'absolute',
    right: 16,
    bottom: 148,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.7)',
    borderRadius: 24,
    paddingHorizontal: 14,
    paddingVertical: 11,
    backgroundColor: 'rgba(255,255,255,0.9)',
    shadowColor: '#101828',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.14,
    shadowRadius: 22,
    elevation: 9,
  },
  locationButtonPressed: {
    opacity: 0.78,
  },
  locationButtonText: {
    color: '#111111',
    fontSize: 13,
    fontWeight: '900',
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
  pickupPin: {
    position: 'absolute',
    top: '50%',
    left: '50%',
    alignItems: 'center',
    transform: [{ translateX: -27 }, { translateY: -54 }],
  },
  pinCircle: {
    width: 54,
    height: 54,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 27,
    backgroundColor: '#FFD400',
    shadowColor: '#101828',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.18,
    shadowRadius: 24,
    elevation: 10,
  },
  pinStem: {
    width: 4,
    height: 16,
    marginTop: -2,
    borderRadius: 999,
    backgroundColor: '#111111',
  },
});
