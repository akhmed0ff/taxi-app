import {
  Order,
  OrderStatus,
  Point,
  RideHistoryFilter,
  RideHistoryItem,
  TariffClass,
  FareBreakdown,
} from '../types/order';

const API_URL = process.env.EXPO_PUBLIC_API_URL ?? 'http://localhost:3000';

export interface CustomerSession {
  accessToken: string;
  refreshToken: string;
  customerId: string;
}

interface AuthResponse {
  accessToken: string;
  refreshToken: string;
  user: {
    id: string;
  };
}

export interface CreateOrderInput {
  accessToken: string;
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
  const password = process.env.EXPO_PUBLIC_CUSTOMER_PASSWORD ?? 'password123';
  const data = await registerPassenger({
    phone,
    password,
    name: 'Passenger',
  }).catch((error) => {
    if (!isConflictError(error)) {
      throw error;
    }

    return loginPassengerWithPassword({ phone, password });
  });

  return {
    accessToken: data.accessToken,
    refreshToken: data.refreshToken,
    customerId: data.user.id,
  };
}

export async function registerPassenger(input: {
  phone: string;
  password: string;
  name: string;
}): Promise<AuthResponse> {
  const registerResponse = await fetch(`${API_URL}/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      ...input,
      role: 'PASSENGER',
    }),
  });

  if (registerResponse.ok) {
    return registerResponse.json();
  }

  if (registerResponse.status !== 409) {
    throw new Error(await readError(registerResponse, 'Failed to register passenger'));
  }

  throw new Error('PHONE_ALREADY_REGISTERED');
}

export async function loginPassengerWithPassword(input: {
  phone: string;
  password: string;
}): Promise<AuthResponse> {
  const loginResponse = await fetch(`${API_URL}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
  });

  if (!loginResponse.ok) {
    throw new Error(await readError(loginResponse, 'Failed to login passenger'));
  }

  return loginResponse.json();
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
  return {
    accessToken: data.accessToken,
    refreshToken: data.refreshToken,
    customerId: data.user.id,
  };
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

  return response.json();
}

export async function createOrder(input: CreateOrderInput): Promise<Order> {
  const response = await fetch(`${API_URL}/orders`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${input.accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      customerId: input.customerId,
      pickupLat: input.pickup.lat,
      pickupLng: input.pickup.lng,
      pickupAddress: input.pickup.address,
      dropoffLat: input.dropoff.lat,
      dropoffLng: input.dropoff.lng,
      dropoffAddress: input.dropoff.address,
      tariffClass: input.tariff,
    }),
  });

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
  const response = await fetch(`${API_URL}/orders/${orderId}/cancel`, {
    method: 'PATCH',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ reason }),
  });

  if (!response.ok) {
    throw new Error(await readError(response, 'Failed to cancel order'));
  }

  return response.json();
}

export async function fetchPassengerRideHistory(
  accessToken: string,
  filter: RideHistoryFilter,
): Promise<RideHistoryItem[]> {
  const response = await fetch(`${API_URL}/orders/history/passenger?filter=${filter}`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  if (!response.ok) {
    throw new Error(await readError(response, 'Failed to load ride history'));
  }

  const rides = (await response.json()) as BackendRide[];
  return rides.map((ride) => mapRideToHistoryItem(ride));
}

export function mapRideToOrder(
  ride: BackendRide,
  tariff: TariffClass = 'ECONOMY',
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
    ...mapRideToOrder(ride, ride.tariffClass ?? 'ECONOMY'),
    createdAt: ride.createdAt,
    paymentStatus: ride.payment?.status,
  };
}

async function readError(response: Response, fallback: string) {
  const body = await response.text();
  return body ? `${fallback}: ${body}` : fallback;
}

function isConflictError(error: unknown) {
  return error instanceof Error && error.message === 'PHONE_ALREADY_REGISTERED';
}
