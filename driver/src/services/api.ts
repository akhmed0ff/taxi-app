import { DriverStatus } from '../types/order';

const API_URL = process.env.EXPO_PUBLIC_API_URL ?? 'http://localhost:3000';

export interface DriverSession {
  accessToken: string;
  refreshToken: string;
  driverId: string;
}

export async function loginDriver(): Promise<DriverSession> {
  const phone = process.env.EXPO_PUBLIC_DRIVER_PHONE ?? '+998901112233';
  const password = process.env.EXPO_PUBLIC_DRIVER_PASSWORD ?? 'password123';
  const data = await registerOrLoginDriver({
    phone,
    password,
    name: 'Driver',
    role: 'DRIVER',
  });

  return {
    accessToken: data.accessToken,
    refreshToken: data.refreshToken,
    driverId: data.driver.id,
  };
}

async function registerOrLoginDriver(input: {
  phone: string;
  password: string;
  name: string;
  role: 'DRIVER';
}) {
  const registerResponse = await fetch(`${API_URL}/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
  });

  if (registerResponse.ok) {
    return registerResponse.json();
  }

  if (registerResponse.status !== 409) {
    throw new Error(await readError(registerResponse, 'Failed to register driver'));
  }

  const loginResponse = await fetch(`${API_URL}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      phone: input.phone,
      password: input.password,
    }),
  });

  if (!loginResponse.ok) {
    throw new Error(await readError(loginResponse, 'Failed to login driver'));
  }

  return loginResponse.json();
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
    throw new Error(await readError(response, 'Failed to update driver status'));
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
    throw new Error(await readError(response, 'Failed to update driver location'));
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
    throw new Error(await readError(response, 'Failed to accept order'));
  }

  return response.json();
}

export async function markArrived(accessToken: string, orderId: string) {
  const response = await fetch(`${API_URL}/orders/${orderId}/arrive`, {
    method: 'PATCH',
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  if (!response.ok) {
    throw new Error(await readError(response, 'Failed to mark arrived'));
  }

  return response.json();
}

export async function startTrip(accessToken: string, orderId: string) {
  const response = await fetch(`${API_URL}/orders/${orderId}/start`, {
    method: 'PATCH',
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  if (!response.ok) {
    throw new Error(await readError(response, 'Failed to start trip'));
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
    throw new Error(await readError(response, 'Failed to complete trip'));
  }

  return response.json();
}

async function readError(response: Response, fallback: string) {
  const body = await response.text();
  return body ? `${fallback}: ${body}` : fallback;
}
