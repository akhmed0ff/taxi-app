import {
  DriverStatus,
  RideHistoryFilter,
  RideHistoryItem,
  TripStatus,
} from '../types/order';

const API_URL = process.env.EXPO_PUBLIC_API_URL ?? 'http://localhost:3000';

export interface DriverSession {
  accessToken: string;
  refreshToken: string;
  driverId: string;
}

interface AuthResponse {
  accessToken: string;
  refreshToken: string;
  user: {
    id: string;
  };
  driver?: {
    id: string;
  };
}

export async function loginDriver(phone = process.env.EXPO_PUBLIC_DRIVER_PHONE ?? '+998901112233'): Promise<DriverSession> {
  const password = process.env.EXPO_PUBLIC_DRIVER_PASSWORD ?? 'password123';
  const data = await registerDriver({
    phone,
    password,
    name: 'Driver',
  }).catch((error) => {
    if (!isConflictError(error)) {
      throw error;
    }

    return loginDriverWithPassword({ phone, password });
  });

  if (!data.driver?.id) {
    throw new Error('Driver profile is missing');
  }

  return {
    accessToken: data.accessToken,
    refreshToken: data.refreshToken,
    driverId: data.driver.id,
  };
}

export async function registerDriver(input: {
  phone: string;
  password: string;
  name: string;
}): Promise<AuthResponse> {
  const registerResponse = await fetch(`${API_URL}/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      ...input,
      role: 'DRIVER',
    }),
  });

  if (registerResponse.ok) {
    return registerResponse.json();
  }

  if (registerResponse.status !== 409) {
    throw new Error(await readError(registerResponse, 'Failed to register driver'));
  }

  throw new Error('PHONE_ALREADY_REGISTERED');
}

export async function loginDriverWithPassword(input: {
  phone: string;
  password: string;
}): Promise<AuthResponse> {
  const loginResponse = await fetch(`${API_URL}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
  });

  if (!loginResponse.ok) {
    throw new Error(await readError(loginResponse, 'Failed to login driver'));
  }

  return loginResponse.json();
}

export async function refreshDriverSession(
  refreshToken: string,
): Promise<DriverSession> {
  const response = await fetch(`${API_URL}/auth/refresh`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ refreshToken }),
  });

  if (!response.ok) {
    throw new Error(await readError(response, 'Failed to refresh driver session'));
  }

  const data = (await response.json()) as AuthResponse;

  if (!data.driver?.id) {
    throw new Error('Driver profile is missing');
  }

  return {
    accessToken: data.accessToken,
    refreshToken: data.refreshToken,
    driverId: data.driver.id,
  };
}

export async function logoutDriver(refreshToken: string) {
  const response = await fetch(`${API_URL}/auth/logout`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ refreshToken }),
  });

  if (!response.ok) {
    throw new Error(await readError(response, 'Failed to logout driver'));
  }

  return response.json();
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

export async function cancelOrder(
  accessToken: string,
  orderId: string,
  reason = 'DRIVER_CANCELLED',
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

export async function fetchDriverRideHistory(
  accessToken: string,
  filter: RideHistoryFilter = 'completed',
): Promise<RideHistoryItem[]> {
  const response = await fetch(`${API_URL}/orders/history/driver?filter=${filter}`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  if (!response.ok) {
    throw new Error(await readError(response, 'Failed to load driver history'));
  }

  const rides = (await response.json()) as BackendRide[];
  return rides.map(mapBackendRideToHistoryItem);
}

interface BackendRide {
  id: string;
  status: TripStatus | 'DRIVER_ASSIGNED' | 'SEARCHING_DRIVER' | 'CANCELLED';
  pickupLat: number;
  pickupLng: number;
  pickupAddress?: string;
  dropoffLat: number;
  dropoffLng: number;
  dropoffAddress?: string;
  estimatedFare?: number;
  finalFare?: number;
  distanceMeters?: number;
  createdAt?: string;
  customer?: {
    name?: string;
    phone?: string;
  };
}

function mapBackendRideToHistoryItem(ride: BackendRide): RideHistoryItem {
  return {
    id: ride.id,
    pickupAddress: ride.pickupAddress ?? 'Подача',
    dropoffAddress: ride.dropoffAddress ?? 'Назначение',
    pickup: {
      lat: ride.pickupLat,
      lng: ride.pickupLng,
    },
    dropoff: {
      lat: ride.dropoffLat,
      lng: ride.dropoffLng,
    },
    price: ride.finalFare ?? ride.estimatedFare ?? 0,
    distanceMeters: ride.distanceMeters ?? 0,
    expiresInSeconds: 0,
    status: normalizeTripStatus(ride.status),
    createdAt: ride.createdAt,
    passengerName: ride.customer?.name ?? ride.customer?.phone,
  };
}

function normalizeTripStatus(status: BackendRide['status']): RideHistoryItem['status'] {
  if (status === 'DRIVER_ASSIGNED') {
    return 'ACCEPTED';
  }

  if (status === 'SEARCHING_DRIVER') {
    return 'OFFERED';
  }

  return status;
}

async function readError(response: Response, fallback: string) {
  const body = await response.text();
  return body ? `${fallback}: ${body}` : fallback;
}

function isConflictError(error: unknown) {
  return error instanceof Error && error.message === 'PHONE_ALREADY_REGISTERED';
}
