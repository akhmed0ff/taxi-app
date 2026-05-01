import {
  Order,
  OrderStatus,
  Point,
  RideHistoryFilter,
  RideHistoryItem,
  TariffClass,
  FareBreakdown,
} from '../types/order';
import {
  authorizedFetch,
  clearCustomerSession,
  CustomerDevSession,
  getCustomerDevSession,
  saveCustomerSession,
} from '../api/client';

const API_URL = (process.env.EXPO_PUBLIC_API_URL ?? 'http://localhost:3000').replace(
  /\/+$/,
  '',
);

export type CustomerSession = CustomerDevSession;

export interface RouteGeometry {
  coordinates: [number, number][];
  type: 'LineString';
}

export interface RouteResponse {
  distance: number;
  duration: number;
  geometry: RouteGeometry;
}

export interface DestinationSearchResult {
  title: string;
  subtitle: string;
  lat: number;
  lng: number;
  fullAddress: string;
}

export interface ReverseGeocodeResult {
  title: string;
  subtitle: string;
  fullAddress: string;
}

export function isNetworkError(error: unknown) {
  if (!(error instanceof Error)) {
    return false;
  }

  const message = error.message.toLowerCase();
  return (
    message.includes('network request failed') ||
    message.includes('fetch failed') ||
    message.includes('failed to fetch')
  );
}

interface AuthResponse {
  accessToken: string;
  refreshToken: string;
  user: {
    id: string;
  };
}

export interface CreateOrderInput {
  accessToken?: string;
  customerId: string;
  pickup: Point;
  dropoff: Point;
  tariff: TariffClass;
}

interface BackendRide {
  id: string;
  status: OrderStatus;
  pickupLat: number;
  pickupLng: number;
  pickupAddress?: string;
  dropoffLat: number;
  dropoffLng: number;
  dropoffAddress?: string;
  estimatedFare?: number;
  estimatedFareDetails?: FareBreakdown;
  finalFare?: number;
  finalFareDetails?: FareBreakdown;
  driverId?: string;
  tariffClass?: TariffClass;
  createdAt?: string;
  payment?: {
    status: string;
  };
}

export async function loginPassenger(phone: string): Promise<CustomerSession> {
  return getCustomerDevSession(phone);
}

export async function ensurePassengerDevSession(): Promise<CustomerSession> {
  return getCustomerDevSession();
}

export async function refreshPassengerSession(
  refreshToken: string,
): Promise<CustomerSession> {
  const response = await fetch(`${API_URL}/auth/refresh`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ refreshToken }),
  });

  if (!response.ok) {
    throw new Error(await readError(response, 'Failed to refresh passenger session'));
  }

  const data = (await response.json()) as AuthResponse;
  return saveCustomerSession({
    accessToken: data.accessToken,
    refreshToken: data.refreshToken,
    customerId: data.user.id,
    user: data.user,
  });
}

export async function logoutPassenger(refreshToken: string) {
  const response = await fetch(`${API_URL}/auth/logout`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ refreshToken }),
  });

  if (!response.ok) {
    throw new Error(await readError(response, 'Failed to logout passenger'));
  }

  const body = await response.json();
  await clearCustomerSession();
  return body;
}

export async function createOrder(input: CreateOrderInput): Promise<Order> {
  const response = await authorizedFetch('/orders', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      customerId: input.customerId,
      pickupLat: input.pickup.lat,
      pickupLng: input.pickup.lng,
      destinationLat: input.dropoff.lat,
      destinationLng: input.dropoff.lng,
      pickupAddress: input.pickup.address,
      dropoffLat: input.dropoff.lat,
      dropoffLng: input.dropoff.lng,
      dropoffAddress: input.dropoff.address,
      class: input.tariff,
      tariffClass: input.tariff,
    }),
  }, input.accessToken);

  if (!response.ok) {
    throw new Error(await readError(response, 'Failed to create order'));
  }

  return mapRideToOrder(await response.json(), input.tariff);
}

export async function cancelOrder(
  accessToken: string,
  orderId: string,
  reason = 'PASSENGER_CANCELLED',
) {
  const response = await authorizedFetch(`/orders/${orderId}/cancel`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ reason }),
  }, accessToken);

  if (!response.ok) {
    throw new Error(await readError(response, 'Failed to cancel order'));
  }

  return response.json();
}

export async function fetchRoute(input: {
  destinationLat: number;
  destinationLng: number;
  pickupLat: number;
  pickupLng: number;
}): Promise<RouteResponse> {
  const params = new URLSearchParams({
    destinationLat: String(input.destinationLat),
    destinationLng: String(input.destinationLng),
    pickupLat: String(input.pickupLat),
    pickupLng: String(input.pickupLng),
  });
  const response = await fetch(`${API_URL}/maps/route?${params.toString()}`);

  if (!response.ok) {
    throw new Error(await readError(response, 'Failed to fetch route'));
  }

  return response.json() as Promise<RouteResponse>;
}

export async function searchDestinationAddresses(
  query: string,
): Promise<DestinationSearchResult[]> {
  const params = new URLSearchParams({ q: query });
  const response = await fetch(`${API_URL}/maps/search?${params.toString()}`);

  if (!response.ok) {
    throw new Error(await readError(response, 'Failed to search destination'));
  }

  return response.json() as Promise<DestinationSearchResult[]>;
}

export async function reverseGeocodePickup(input: {
  lat: number;
  lng: number;
}): Promise<ReverseGeocodeResult> {
  const params = new URLSearchParams({
    lat: String(input.lat),
    lng: String(input.lng),
  });
  const response = await fetch(`${API_URL}/maps/reverse?${params.toString()}`);

  if (!response.ok) {
    throw new Error(await readError(response, 'Failed to reverse geocode pickup'));
  }

  return response.json() as Promise<ReverseGeocodeResult>;
}

export async function fetchPassengerRideHistory(
  accessToken: string,
  filter: RideHistoryFilter,
): Promise<RideHistoryItem[]> {
  const response = await authorizedFetch(
    `/orders/history/passenger?filter=${filter}`,
    {},
    accessToken,
  );

  if (!response.ok) {
    throw new Error(await readError(response, 'Failed to load ride history'));
  }

  const rides = (await response.json()) as BackendRide[];
  return rides.map((ride) => mapRideToHistoryItem(ride));
}

export function mapRideToOrder(
  ride: BackendRide,
  tariff: TariffClass = 'STANDARD',
): Order {
  return {
    id: ride.id,
    status: ride.status,
    pickup: {
      lat: ride.pickupLat,
      lng: ride.pickupLng,
      address: ride.pickupAddress,
    },
    dropoff: {
      lat: ride.dropoffLat,
      lng: ride.dropoffLng,
      address: ride.dropoffAddress,
    },
    tariff,
    price: ride.finalFare ?? ride.estimatedFare ?? 0,
    fareBreakdown: ride.finalFareDetails ?? ride.estimatedFareDetails,
    driver: ride.driverId
      ? {
          id: ride.driverId,
          name: 'ANGREN TAXI',
          car: 'ANGREN TAXI',
          rating: 5,
          etaMinutes: 4,
        }
      : undefined,
  };
}

function mapRideToHistoryItem(ride: BackendRide): RideHistoryItem {
  return {
    ...mapRideToOrder(ride, ride.tariffClass ?? 'STANDARD'),
    createdAt: ride.createdAt,
    paymentStatus: ride.payment?.status,
  };
}

async function readError(response: Response, fallback: string) {
  const body = await response.text();
  return body ? `${fallback}: ${body}` : fallback;
}
