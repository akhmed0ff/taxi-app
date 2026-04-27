export type TariffClass = 'ECONOMY' | 'COMFORT' | 'PREMIUM';

export type OrderStatus =
  | 'CREATED'
  | 'SEARCHING_DRIVER'
  | 'DRIVER_ASSIGNED'
  | 'DRIVER_ARRIVED'
  | 'IN_PROGRESS'
  | 'COMPLETED'
  | 'CANCELLED';

export interface Point {
  lat: number;
  lng: number;
  address?: string;
}

export interface DriverPreview {
  id: string;
  name: string;
  car: string;
  rating: number;
  etaMinutes: number;
}

export interface Order {
  id: string;
  status: OrderStatus;
  pickup: Point;
  dropoff: Point;
  tariff: TariffClass;
  price: number;
  driver?: DriverPreview;
}
