import Mapbox, { MapState } from '@rnmapbox/maps';
import { useEffect, useMemo } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Point } from '../../types/order';

const mapboxAccessToken = process.env.EXPO_PUBLIC_MAPBOX_ACCESS_TOKEN;

interface MapboxPassengerMapProps {
  currentPoint: Point;
  dropoffPoint: Point;
  hasDestination: boolean;
  onCenterChanged: (latitude: number, longitude: number) => void;
}

export function MapboxPassengerMap({
  currentPoint,
  dropoffPoint,
  hasDestination,
  onCenterChanged,
}: MapboxPassengerMapProps) {
  useEffect(() => {
    if (mapboxAccessToken) {
      void Mapbox.setAccessToken(mapboxAccessToken);
    }
  }, []);

  const routeShape = useMemo(
    () => ({
      type: 'Feature' as const,
      properties: {},
      geometry: {
        type: 'LineString' as const,
        coordinates: [
          [currentPoint.lng, currentPoint.lat],
          [dropoffPoint.lng, dropoffPoint.lat],
        ],
      },
    }),
    [currentPoint.lat, currentPoint.lng, dropoffPoint.lat, dropoffPoint.lng],
  );

  const destinationShape = useMemo(
    () => ({
      type: 'Feature' as const,
      properties: {},
      geometry: {
        type: 'Point' as const,
        coordinates: [dropoffPoint.lng, dropoffPoint.lat],
      },
    }),
    [dropoffPoint.lat, dropoffPoint.lng],
  );

  function handleMapIdle(state: MapState) {
    const [longitude, latitude] = state.properties.center;

    if (typeof latitude === 'number' && typeof longitude === 'number') {
      onCenterChanged(latitude, longitude);
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
    <Mapbox.MapView
      attributionEnabled={false}
      compassEnabled={false}
      logoEnabled={false}
      onMapIdle={handleMapIdle}
      scaleBarEnabled={false}
      style={StyleSheet.absoluteFill}
      styleURL={Mapbox.StyleURL.Light}
    >
      <Mapbox.Camera
        animationDuration={450}
        centerCoordinate={[currentPoint.lng, currentPoint.lat]}
        zoomLevel={14}
      />
      <Mapbox.UserLocation visible />

      {hasDestination ? (
        <>
          <Mapbox.ShapeSource id="passenger-route-source" shape={routeShape}>
            <Mapbox.LineLayer
              id="passenger-route-line"
              style={{
                lineCap: 'round',
                lineColor: '#111111',
                lineJoin: 'round',
                lineWidth: 5,
              }}
            />
          </Mapbox.ShapeSource>
          <Mapbox.ShapeSource id="destination-source" shape={destinationShape}>
            <Mapbox.CircleLayer
              id="destination-circle"
              style={{
                circleColor: '#FFD400',
                circleRadius: 8,
                circleStrokeColor: '#111111',
                circleStrokeWidth: 3,
              }}
            />
          </Mapbox.ShapeSource>
        </>
      ) : null}
    </Mapbox.MapView>
  );
}

const styles = StyleSheet.create({
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
});
