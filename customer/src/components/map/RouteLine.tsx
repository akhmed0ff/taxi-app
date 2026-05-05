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
  // RouteLine сейчас не используется в активном UI клиента.
  // Оставляем компонент, но без Mapbox, чтобы сборка не зависела от @rnmapbox/maps.
  void destinationLat;
  void destinationLng;
  void pickupLat;
  void pickupLng;
  void routeCoordinates;

  return null;
}
