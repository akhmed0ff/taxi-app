export type UserRole = 'PASSENGER' | 'DRIVER' | 'ADMIN';
export type TariffClass = 'ECONOMY' | 'COMFORT' | 'PREMIUM';
export type RideStatus =
  | 'SEARCHING_DRIVER'
  | 'DRIVER_ASSIGNED'
  | 'DRIVER_ARRIVED'
  | 'IN_PROGRESS'
  | 'COMPLETED'
  | 'CANCELLED';

export interface AuthUser {
  id: string;
  phone: string;
  name?: string;
  role: UserRole;
}

export interface AuthSession {
  accessToken: string;
  refreshToken: string;
  user: AuthUser;
}

export interface RegisterInput {
  phone: string;
  password: string;
  name?: string;
}

export interface LoginInput {
  phone: string;
  password: string;
}

export interface CreateOrderInput {
  customerId: string;
  pickupAddress?: string;
  pickupLat: number;
  pickupLng: number;
  dropoffAddress?: string;
  dropoffLat: number;
  dropoffLng: number;
  tariffClass: TariffClass;
}

export interface DriverUser {
  id: string;
  phone: string;
  name?: string;
}

export interface DriverInfo {
  id: string;
  status?: string;
  rating?: number;
  user?: DriverUser;
  vehicle?: {
    make?: string;
    model?: string;
    color?: string;
    plateNumber?: string;
  };
}

export interface PaymentInfo {
  status: string;
  method?: string;
  amount?: number;
}

export interface Ride {
  id: string;
  status: RideStatus;
  customerId: string;
  driverId?: string | null;
  pickupAddress?: string;
  pickupLat: number;
  pickupLng: number;
  dropoffAddress?: string;
  dropoffLat: number;
  dropoffLng: number;
  tariffClass?: TariffClass;
  estimatedFare?: number;
  finalFare?: number;
  createdAt: string;
  cancelReason?: string | null;
  driver?: DriverInfo | null;
  payment?: PaymentInfo | null;
}

export interface DriverLocationPayload {
  rideId?: string;
  driverId?: string;
  lat: number;
  lng: number;
}
