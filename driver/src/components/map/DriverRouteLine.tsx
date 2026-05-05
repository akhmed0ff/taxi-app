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
  // Map rendering disabled (no Mapbox).
  void coordinates;
  void fromLat;
  void fromLng;
  void id;
  void lineColor;
  void toLat;
  void toLng;

  return null;
}
