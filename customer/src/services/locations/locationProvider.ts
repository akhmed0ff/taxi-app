import { FLAGS } from '../../config/flags';
import { DEV_DESTINATIONS, DEV_PICKUP } from '../../dev/devLocations';
import type { Point } from '../../types/order';

export type DestinationOption = {
  label: string;
  point: Point;
};

const DEV_PICKUP_ADDRESS = 'Ангрен, текущая точка';

export function getPickupPoint(): { point: Point; addressLabel: string; isLoading: boolean } {
  if (FLAGS.USE_DEV_COORDS) {
    return {
      point: { ...DEV_PICKUP, address: DEV_PICKUP_ADDRESS },
      addressLabel: DEV_PICKUP_ADDRESS,
      isLoading: false,
    };
  }

  // TODO: wire real geolocation + reverse geocode when enabled.
  return {
    point: { ...DEV_PICKUP, address: DEV_PICKUP_ADDRESS },
    addressLabel: 'Определяем адрес...',
    isLoading: true,
  };
}

export function getDestinationOptions(): DestinationOption[] {
  if (!FLAGS.USE_FIXED_DESTINATIONS) {
    // TODO: wire real destination search when enabled.
    return DEV_DESTINATIONS.map((item) => ({
      label: item.label,
      point: {
        lat: item.coordinates.lat,
        lng: item.coordinates.lng,
        address: `Ангрен, ${item.label}`,
      },
    }));
  }

  return DEV_DESTINATIONS.map((item) => ({
    label: item.label,
    point: {
      lat: item.coordinates.lat,
      lng: item.coordinates.lng,
      address: `Ангрен, ${item.label}`,
    },
  }));
}

