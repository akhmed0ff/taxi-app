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
    let timer: ReturnType<typeof setInterval> | undefined;

    void (async () => {
      const permission = await Location.requestForegroundPermissionsAsync();

      if (permission.status !== 'granted' || cancelled) {
        return;
      }

      const sendLocation = async () => {
        const location = await Location.getCurrentPositionAsync({});

        if (cancelled) {
          return;
        }

        try {
          await updateDriverLocation(
            accessToken,
            driverId,
            location.coords.latitude,
            location.coords.longitude,
          );
        } catch (error) {
          console.warn(error);
        }
      };

      void sendLocation();
      timer = setInterval(() => {
        void sendLocation();
      }, intervalMs);
    })();

    return () => {
      cancelled = true;
      if (timer) {
        clearInterval(timer);
      }
    };
  }, [accessToken, driverId, enabled, intervalMs]);
}
