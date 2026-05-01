import { StyleSheet } from 'react-native';
import MapView, { Marker, Polyline, Region } from 'react-native-maps';
import { Point } from '../../types/order';

interface ReactNativePassengerMapProps {
  currentPoint: Point;
  dropoffAddress: string;
  dropoffPoint: Point;
  hasDestination: boolean;
  initialRegion: Region;
  mapRegion: Region;
  onRegionChangeComplete: (region: Region) => void;
}

export function ReactNativePassengerMap({
  currentPoint,
  dropoffAddress,
  dropoffPoint,
  hasDestination,
  initialRegion,
  mapRegion,
  onRegionChangeComplete,
}: ReactNativePassengerMapProps) {
  return (
    <MapView
      initialRegion={initialRegion}
      onRegionChangeComplete={onRegionChangeComplete}
      region={mapRegion}
      showsCompass={false}
      showsMyLocationButton={false}
      showsUserLocation
      style={StyleSheet.absoluteFill}
    >
      {hasDestination ? (
        <>
          <Polyline
            coordinates={[
              {
                latitude: currentPoint.lat,
                longitude: currentPoint.lng,
              },
              {
                latitude: dropoffPoint.lat,
                longitude: dropoffPoint.lng,
              },
            ]}
            strokeColor="#111111"
            strokeWidth={5}
          />
          <Marker
            coordinate={{
              latitude: dropoffPoint.lat,
              longitude: dropoffPoint.lng,
            }}
            title="Куда"
            description={dropoffAddress}
          />
        </>
      ) : null}
    </MapView>
  );
}
