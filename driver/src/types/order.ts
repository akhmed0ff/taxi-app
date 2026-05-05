export type DriverStatus = 'OFFLINE' | 'ONLINE' | 'BUSY';

export { ORDER_STATUSES } from './orderStatus';
export type { OrderStatus, OrderStatus as OrderStatusType } from './orderStatus';

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
  tariffClass?: string;
}

export interface ActiveTrip extends OrderOffer {
  status: import('./orderStatus').OrderStatus;
}

export type RideHistoryFilter = 'active' | 'completed' | 'cancelled';

export interface RideHistoryItem extends Omit<ActiveTrip, 'status'> {
  status: import('./orderStatus').OrderStatus;
  createdAt?: string;
  passengerName?: string;
  paymentStatus?: string;
}
