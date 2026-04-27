export type DriverStatus = 'OFFLINE' | 'ONLINE' | 'BUSY';

export type TripStatus =
  | 'OFFERED'
  | 'ACCEPTED'
  | 'DRIVER_ARRIVED'
  | 'IN_PROGRESS'
  | 'COMPLETED';

export interface Coords {
  lat: number;
  lng: number;
}

export interface OrderOffer {
  id: string;
  pickupAddress: string;
  dropoffAddress: string;
  pickup: Coords;
  dropoff: Coords;
  price: number;
  distanceMeters: number;
  expiresInSeconds: number;
}

export interface ActiveTrip extends OrderOffer {
  status: TripStatus;
}
