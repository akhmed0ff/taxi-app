import { Order, OrderStatus, Point, TariffClass } from '../types/order';

const API_URL = process.env.EXPO_PUBLIC_API_URL ?? 'http://localhost:3000';

export interface CustomerSession {
  accessToken: string;
  customerId: string;
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
  finalFare?: number;
  driverId?: string;
}

export async function loginPassenger(phone: string): Promise<CustomerSession> {
  const response = await fetch(`${API_URL}/auth/dev-login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      phone,
      name: 'Passenger',
      role: 'PASSENGER',
    }),
  });

  if (!response.ok) {
    throw new Error('Failed to login passenger');
  }

  const data = await response.json();

  return {
    accessToken: data.accessToken,
    customerId: data.user.id,
  };
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
    }),
  });

  if (!response.ok) {
    throw new Error(await readError(response, 'Failed to create order'));
  }

  return mapRideToOrder(await response.json(), input.tariff);
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
    driver: ride.driverId
      ? {
          id: ride.driverId,
          name: 'Driver',
          car: 'ANGREN TAXI',
          rating: 5,
          etaMinutes: 4,
        }
      : undefined,
  };
}

async function readError(response: Response, fallback: string) {
  const body = await response.text();
  return body ? `${fallback}: ${body}` : fallback;
}
