import { DriverStatus } from '../types/order';

const API_URL = process.env.EXPO_PUBLIC_API_URL ?? 'http://localhost:3000';

export interface DriverSession {
  accessToken: string;
  driverId: string;
}

export async function loginDriver(): Promise<DriverSession> {
  const response = await fetch(`${API_URL}/auth/dev-login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      phone: process.env.EXPO_PUBLIC_DRIVER_PHONE ?? '+998901112233',
      name: 'Driver',
      role: 'DRIVER',
    }),
  });

  if (!response.ok) {
    throw new Error('Failed to login driver');
  }

  const data = await response.json();

  return {
    accessToken: data.accessToken,
    driverId: data.driver.id,
  };
}

export async function updateDriverStatus(
  accessToken: string,
  driverId: string,
  status: DriverStatus,
) {
  const response = await fetch(`${API_URL}/drivers/${driverId}/status`, {
    method: 'PATCH',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ status }),
  });

  if (!response.ok) {
    throw new Error('Failed to update driver status');
  }

  return response.json();
}

export async function updateDriverLocation(
  accessToken: string,
  driverId: string,
  lat: number,
  lng: number,
) {
  const response = await fetch(`${API_URL}/drivers/${driverId}/location`, {
    method: 'PATCH',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ lat, lng }),
  });

  if (!response.ok) {
    throw new Error('Failed to update driver location');
  }

  return response.json();
}

export async function acceptOrder(
  accessToken: string,
  orderId: string,
  driverId: string,
) {
  const response = await fetch(`${API_URL}/orders/${orderId}/accept/${driverId}`, {
    method: 'PATCH',
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  if (!response.ok) {
    throw new Error('Failed to accept order');
  }

  return response.json();
}

export async function markArrived(accessToken: string, orderId: string) {
  const response = await fetch(`${API_URL}/orders/${orderId}/arrive`, {
    method: 'PATCH',
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  if (!response.ok) {
    throw new Error('Failed to mark arrived');
  }

  return response.json();
}

export async function startTrip(accessToken: string, orderId: string) {
  const response = await fetch(`${API_URL}/orders/${orderId}/start`, {
    method: 'PATCH',
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  if (!response.ok) {
    throw new Error('Failed to start trip');
  }

  return response.json();
}

export async function completeTrip(accessToken: string, orderId: string) {
  const response = await fetch(`${API_URL}/orders/${orderId}/complete`, {
    method: 'PATCH',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ paymentMethod: 'CASH' }),
  });

  if (!response.ok) {
    throw new Error('Failed to complete trip');
  }

  return response.json();
}
