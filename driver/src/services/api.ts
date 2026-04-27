import { DriverStatus } from '../types/order';

const API_URL = process.env.EXPO_PUBLIC_API_URL ?? 'http://localhost:3000';

export async function updateDriverStatus(
  driverId: string,
  status: DriverStatus,
) {
  const response = await fetch(`${API_URL}/drivers/${driverId}/status`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ status }),
  });

  if (!response.ok) {
    throw new Error('Failed to update driver status');
  }

  return response.json();
}

export async function acceptOrder(orderId: string, driverId: string) {
  const response = await fetch(`${API_URL}/orders/${orderId}/accept/${driverId}`, {
    method: 'PATCH',
  });

  if (!response.ok) {
    throw new Error('Failed to accept order');
  }

  return response.json();
}
