import * as Location from 'expo-location';
import { useEffect } from 'react';
import { updateDriverLocation } from '../services/api';

interface UseDriverLocationTrackingInput {
  accessToken?: string;
  driverId?: string;
  enabled: boolean;
  intervalMs?: number;
}

export function useDriverLocationTracking({
  driverId,
  accessToken,
  enabled,
  intervalMs = 2500,
}: UseDriverLocationTrackingInput) {
  useEffect(() => {
    if (!enabled || !driverId || !accessToken) {
      return;
    }

    let cancelled = false;

    const sendLocation = async () => {
      const permission = await Location.requestForegroundPermissionsAsync();

      if (permission.status !== 'granted' || cancelled) {
        return;
      }

      const location = await Location.getCurrentPositionAsync({});

      if (cancelled) {
        return;
      }

      await updateDriverLocation(
        accessToken,
        driverId,
        location.coords.latitude,
        location.coords.longitude,
      );
    };

    void sendLocation();
    const timer = setInterval(() => {
      void sendLocation();
    }, intervalMs);

    return () => {
      cancelled = true;
      clearInterval(timer);
    };
  }, [accessToken, driverId, enabled, intervalMs]);
}
