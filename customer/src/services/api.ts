import type {
  Order,
  OrderStatus,
  Point,
  RideHistoryFilter,
  RideHistoryItem,
  TariffClass,
  FareBreakdown,
} from '../types/order';
import { normalizeOrderStatus } from '../types/orderStatus';
import {
  authorizedFetch,
  clearCustomerSession,
  CustomerDevSession,
  getCustomerDevSession,
  saveCustomerSession,
} from '../api/client';

function getApiUrl() {
  const apiUrl = process.env.EXPO_PUBLIC_API_URL?.trim();

  if (!apiUrl) {
    throw new Error(
      'EXPO_PUBLIC_API_URL is not configured. Add EXPO_PUBLIC_API_URL to customer/.env and restart with npx expo start -c.',
    );
  }

  return apiUrl.replace(/\/+$/, '');
}

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

export interface Tariff {
  tariffClass: TariffClass;
  minimumFare: number;
  perKm: number;
  baseFare: number;
  /** Бесплатные минуты ожидания из тарифа (настраивается в админке / БД). */
  freeWaitingMinutes?: number;
}

/** Публичный тариф (GET /tariffs): цены и ETA из конфигурации backend/admin. */
export interface PublicTariff {
  id: string;
  code: TariffClass;
  title: string;
  isActive: boolean;
  sortOrder: number;
  baseFare: number;
  pricePerKm: number;
  pricePer100m?: number;
  etaMinutes: number;
  seats: number;
  minimumFare: number;
  freeWaitingMinutes: number;
  waitingPerMinute: number;
  stopPerMinute: number;
}

export interface PaginatedRideHistory {
  data: RideHistoryItem[];
  total: number;
  page: number;
  limit: number;
  hasMore: boolean;
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
  /** Класс тарифа (как в backend tariffClass). */
  tariff: TariffClass;
  /** Id строки тарифа из GET /tariffs (опционально, для согласованности с админ-конфигом). */
  tariffId?: string;
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
  const response = await fetch(`${getApiUrl()}/auth/refresh`, {
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
  const response = await fetch(`${getApiUrl()}/auth/logout`, {
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
  const body: Record<string, unknown> = {
    customerId: input.customerId,
    pickupLat: input.pickup.lat,
    pickupLng: input.pickup.lng,
    pickupAddress: input.pickup.address,
    dropoffLat: input.dropoff.lat,
    dropoffLng: input.dropoff.lng,
    dropoffAddress: input.dropoff.address,
    tariffClass: input.tariff,
  };

  if (input.tariffId) {
    body.tariffId = input.tariffId;
  }

  const response = await authorizedFetch(
    '/orders',
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    },
    input.accessToken,
  );

  if (!response.ok) {
    throw new Error(await readError(response, 'Failed to create order'));
  }

  const ride = (await response.json()) as BackendRide;
  return mapRideToOrder(ride, input.tariff);
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

export async function rateRide(
  accessToken: string,
  rideId: string,
  rating: 1 | 2 | 3 | 4 | 5,
) {
  const response = await authorizedFetch(`/orders/${rideId}/rate`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ rating }),
  }, accessToken);

  if (!response.ok) {
    throw new Error(await readError(response, 'Failed to rate ride'));
  }

  return response.json();
}

export async function fetchRoute(input: {
  destinationLat: number;
  destinationLng: number;
  pickupLat: number;
  pickupLng: number;
}): Promise<RouteResponse | null> {
  try {
    const params = new URLSearchParams({
      destinationLat: String(input.destinationLat),
      destinationLng: String(input.destinationLng),
      pickupLat: String(input.pickupLat),
      pickupLng: String(input.pickupLng),
    });
    const base = getApiUrl();
    const response = await fetch(`${base}/maps/route?${params.toString()}`);

    if (!response.ok) {
      console.warn('[fetchRoute] /maps/route failed:', response.status);
      return null;
    }

    return (await response.json()) as RouteResponse;
  } catch (error) {
    console.warn('[fetchRoute] /maps/route error:', error);
    return null;
  }
}

export async function searchDestinationAddresses(
  query: string,
): Promise<DestinationSearchResult[]> {
  const params = new URLSearchParams({ q: query });
  const response = await fetch(`${getApiUrl()}/maps/search?${params.toString()}`);

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
  const response = await fetch(`${getApiUrl()}/maps/reverse?${params.toString()}`);

  if (!response.ok) {
    throw new Error(await readError(response, 'Failed to reverse geocode pickup'));
  }

  return response.json() as Promise<ReverseGeocodeResult>;
}

export async function fetchTariffs(): Promise<Tariff[]> {
  const response = await fetch(`${getApiUrl()}/pricing/tariffs`);

  if (!response.ok) {
    throw new Error(await readError(response, 'Failed to fetch tariffs'));
  }

  return response.json() as Promise<Tariff[]>;
}

export async function getTariffs(): Promise<PublicTariff[]> {
  const response = await fetch(`${getApiUrl()}/tariffs`);

  if (!response.ok) {
    throw new Error(await readError(response, 'Failed to fetch tariffs'));
  }

  return response.json() as Promise<PublicTariff[]>;
}

export async function fetchPassengerRideHistory(
  accessToken: string,
  filter: RideHistoryFilter,
  page = 1,
  limit = 20,
): Promise<PaginatedRideHistory> {
  const response = await authorizedFetch(
    `/orders/history/passenger?filter=${filter}&page=${page}&limit=${limit}`,
    {},
    accessToken,
  );

  if (!response.ok) {
    throw new Error(await readError(response, 'Failed to load ride history'));
  }

  const payload = (await response.json()) as {
    data: BackendRide[];
    total: number;
    page: number;
    limit: number;
    hasMore: boolean;
  };

  return {
    ...payload,
    data: payload.data.map((ride) => mapRideToHistoryItem(ride)),
  };
}

export function mapRideToOrder(
  ride: BackendRide,
  fallbackTariff: TariffClass = 'STANDARD',
): Order {
  const tariff = ride.tariffClass ?? fallbackTariff;

  return {
    id: ride.id,
    status: normalizeOrderStatus(String(ride.status)),
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
