import Mapbox from '@rnmapbox/maps';
import { useMemo } from 'react';

interface RouteLineProps {
  destinationLat: number;
  destinationLng: number;
  pickupLat: number;
  pickupLng: number;
  routeCoordinates?: [number, number][];
}

export function RouteLine({
  destinationLat,
  destinationLng,
  pickupLat,
  pickupLng,
  routeCoordinates,
}: RouteLineProps) {
  const routeShape = useMemo(
    () => ({
      type: 'Feature' as const,
      properties: {},
      geometry: {
        type: 'LineString' as const,
        coordinates:
          routeCoordinates && routeCoordinates.length > 1
            ? routeCoordinates
            : [
                [pickupLng, pickupLat],
                [destinationLng, destinationLat],
              ],
      },
    }),
    [destinationLat, destinationLng, pickupLat, pickupLng, routeCoordinates],
  );

  return (
    <Mapbox.ShapeSource id="passenger-route-source" shape={routeShape}>
      <Mapbox.LineLayer
        id="passenger-route-line"
        style={{
          lineCap: 'round',
          lineColor: '#111111',
          lineJoin: 'round',
          lineOpacity: 0.78,
          lineWidth: 5,
        }}
      />
    </Mapbox.ShapeSource>
  );
}
