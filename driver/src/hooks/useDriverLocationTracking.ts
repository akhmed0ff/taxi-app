import { useEffect } from 'react';
import { updateDriverLocation } from '../services/api';
import { FLAGS } from '../config/flags';
import { DEV_DRIVER_COORDS } from '../dev/devLocations';

interface UseDriverLocationTrackingInput {
  accessToken?: string;
  driverId?: string;
  enabled: boolean;
  intervalMs?: number;
  onLocation?: (coords: { lat: number; lng: number }) => void;
}

export function useDriverLocationTracking({
  driverId,
  accessToken,
  enabled,
  intervalMs = 5000,
  onLocation,
}: UseDriverLocationTrackingInput) {
  useEffect(() => {
    if (!enabled || !driverId || !accessToken) {
      return;
    }

    let cancelled = false;
    let timer: ReturnType<typeof setInterval> | undefined;

    void (async () => {
      const sendLocation = async () => {
        if (cancelled) {
          return;
        }

        try {
          if (FLAGS.USE_DEV_COORDS) {
            onLocation?.(DEV_DRIVER_COORDS);
          }
          await updateDriverLocation(
            accessToken,
            driverId,
            FLAGS.USE_DEV_COORDS ? DEV_DRIVER_COORDS.lat : DEV_DRIVER_COORDS.lat,
            FLAGS.USE_DEV_COORDS ? DEV_DRIVER_COORDS.lng : DEV_DRIVER_COORDS.lng,
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
  }, [accessToken, driverId, enabled, intervalMs, onLocation]);
}
