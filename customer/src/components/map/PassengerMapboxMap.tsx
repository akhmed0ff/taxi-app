import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import * as Location from 'expo-location';
import { useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import type { RouteResponse } from '../../services/api';
import { FakeMapPlaceholder } from './FakeMapPlaceholder';
import { FLAGS } from '../../config/flags';

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
  const [, setCenter] = useState({
    latitude: initialPickupLat,
    longitude: initialPickupLng,
  });

  useEffect(() => {
    setCenter({
      latitude: initialPickupLat,
      longitude: initialPickupLng,
    });
  }, [initialPickupLat, initialPickupLng]);

  useEffect(() => {
    onPickupChange({
      pickupLat: initialPickupLat,
      pickupLng: initialPickupLng,
    });
  }, [initialPickupLat, initialPickupLng, onPickupChange]);

  useEffect(() => {
    if (FLAGS.ENABLE_ROUTE_FETCHING) {
      // Route fetching is handled elsewhere when enabled.
      return;
    }

    // Routing disabled for now (no fetchRoute).
    // Keep callbacks consistent so UI doesn't wait for route calculation.
    onRouteChange?.(null);
    onRouteErrorChange?.(undefined);
    onRouteLoadingChange?.(false);
  }, [
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

  async function moveToUserLocation() {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();

      if (status !== 'granted') {
        return;
      }

      const location = await Location.getCurrentPositionAsync({});
      updatePickup(location.coords.latitude, location.coords.longitude);
    } catch (error) {
      console.warn(error);
    }
  }

  return (
    <View style={styles.container} pointerEvents="box-none">
      <FakeMapPlaceholder />

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
