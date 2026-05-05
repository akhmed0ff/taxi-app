export type TariffClass = 'STANDARD' | 'COMFORT' | 'COMFORT_PLUS' | 'DELIVERY';
export { OrderStatus } from './orderStatus';
export type { OrderStatus as OrderStatusType } from './orderStatus';

export interface Point {
  lat: number;
  lng: number;
  address?: string;
}

export interface DriverPreview {
  id: string;
  name: string;
  car: string;
  eta?: string;
  plate?: string;
  phone?: string;
  rating: number;
  etaMinutes: number;
}

export interface FareBreakdown {
  tariffClass: TariffClass;
  currency: 'UZS';
  distanceKm: number;
  baseFareAmount: number;
  distanceAmount: number;
  freeWaitingMinutes: number;
  waitingMinutes: number;
  paidWaitingMinutes: number;
  waitingAmount: number;
  stopMinutes: number;
  stopAmount: number;
  subtotal: number;
  minimumFare: number;
  minimumFareAdjustment: number;
  total: number;
}

export interface Order {
  id: string;
  status: import('./orderStatus').OrderStatus;
  pickup: Point;
  dropoff: Point;
  tariff: TariffClass;
  price: number;
  fareBreakdown?: FareBreakdown;
  driver?: DriverPreview;
  driverLocation?: Point;
}

export type RideHistoryFilter = 'active' | 'completed' | 'cancelled';

export interface RideHistoryItem extends Order {
  createdAt?: string;
  paymentStatus?: string;
}
