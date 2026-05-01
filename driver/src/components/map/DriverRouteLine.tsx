import Mapbox from '@rnmapbox/maps';
import { useMemo } from 'react';

interface DriverRouteLineProps {
  coordinates?: [number, number][];
  fromLat: number;
  fromLng: number;
  id: string;
  lineColor: string;
  toLat: number;
  toLng: number;
}

export function DriverRouteLine({
  coordinates,
  fromLat,
  fromLng,
  id,
  lineColor,
  toLat,
  toLng,
}: DriverRouteLineProps) {
  const routeShape = useMemo(
    () => ({
      type: 'Feature' as const,
      properties: {},
      geometry: {
        type: 'LineString' as const,
        coordinates:
          coordinates && coordinates.length > 1
            ? coordinates
            : [
                [fromLng, fromLat],
                [toLng, toLat],
              ],
      },
    }),
    [coordinates, fromLat, fromLng, toLat, toLng],
  );

  return (
    <Mapbox.ShapeSource id={`${id}-source`} shape={routeShape}>
      <Mapbox.LineLayer
        id={`${id}-line`}
        style={{
          lineCap: 'round',
          lineColor,
          lineJoin: 'round',
          lineOpacity: 0.84,
          lineWidth: 5,
        }}
      />
    </Mapbox.ShapeSource>
  );
}
