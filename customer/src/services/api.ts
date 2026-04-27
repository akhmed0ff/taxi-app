import { Order, Point, TariffClass } from '../types/order';

const API_URL = process.env.EXPO_PUBLIC_API_URL ?? 'http://localhost:3000';

export interface CreateOrderInput {
  passengerId: string;
  pickup: Point;
  dropoff: Point;
  tariff: TariffClass;
}

export async function createOrder(input: CreateOrderInput): Promise<Order> {
  const response = await fetch(`${API_URL}/orders`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      customerId: input.passengerId,
      pickupLat: input.pickup.lat,
      pickupLng: input.pickup.lng,
      pickupAddress: input.pickup.address,
      dropoffLat: input.dropoff.lat,
      dropoffLng: input.dropoff.lng,
      dropoffAddress: input.dropoff.address,
    }),
  });

  if (!response.ok) {
    throw new Error('Failed to create order');
  }

  const data = await response.json();

  return {
    id: data.id,
    status: data.status,
    pickup: input.pickup,
    dropoff: input.dropoff,
    tariff: input.tariff,
    price: data.estimatedFare ?? 0,
  };
}
