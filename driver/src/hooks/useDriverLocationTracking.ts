import * as Location from 'expo-location';
import { useEffect } from 'react';
import { driverRealtimeClient } from '../services/realtime';

interface UseDriverLocationTrackingInput {
  enabled: boolean;
  intervalMs?: number;
}

export function useDriverLocationTracking({
  enabled,
  intervalMs = 2500,
}: UseDriverLocationTrackingInput) {
  useEffect(() => {
    if (!enabled) {
      return;
    }

    let cancelled = false;

    const timer = setInterval(() => {
      void Location.getCurrentPositionAsync({}).then((location) => {
        if (cancelled) {
          return;
        }

        driverRealtimeClient.emitLocationUpdate({
          lat: location.coords.latitude,
          lng: location.coords.longitude,
        });
      });
    }, intervalMs);

    void Location.requestForegroundPermissionsAsync();

    return () => {
      cancelled = true;
      clearInterval(timer);
    };
  }, [enabled, intervalMs]);
}
