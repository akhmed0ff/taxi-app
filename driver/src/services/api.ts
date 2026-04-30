import {
  DriverStatus,
  RideHistoryFilter,
  RideHistoryItem,
  TripStatus,
} from '../types/order';
import {
  authorizedFetch,
  clearDriverSession,
  DriverDevSession,
  getDriverDevSession,
  saveDriverSession,
} from '../api/client';

const API_URL = (process.env.EXPO_PUBLIC_API_URL ?? 'http://localhost:3000').replace(
  /\/+$/,
  '',
);
export type DriverSession = DriverDevSession;

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
  return getDriverDevSession(phone);
}

export async function ensureDriverDevSession(): Promise<DriverSession> {
  return getDriverDevSession();
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

  return saveDriverSession({
    accessToken: data.accessToken,
    refreshToken: data.refreshToken,
    driverId: data.driver.id,
  });
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

  const body = await response.json();
  await clearDriverSession();
  return body;
}

export async function updateDriverStatus(
  accessToken: string,
  driverId: string,
  status: DriverStatus,
) {
  const response = await authorizedFetch(`/drivers/${driverId}/status`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ status }),
  }, accessToken);

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
  const response = await authorizedFetch(`/drivers/${driverId}/location`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ lat, lng }),
  }, accessToken);

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
  const response = await authorizedFetch(`/orders/${orderId}/accept/${driverId}`, {
    method: 'PATCH',
  }, accessToken);

  if (!response.ok) {
    throw new Error(await readError(response, 'Failed to accept order'));
  }

  return response.json();
}

export async function markArrived(accessToken: string, orderId: string) {
  const response = await authorizedFetch(`/orders/${orderId}/arrive`, {
    method: 'PATCH',
  }, accessToken);

  if (!response.ok) {
    throw new Error(await readError(response, 'Failed to mark arrived'));
  }

  return response.json();
}

export async function startTrip(accessToken: string, orderId: string) {
  const response = await authorizedFetch(`/orders/${orderId}/start`, {
    method: 'PATCH',
  }, accessToken);

  if (!response.ok) {
    throw new Error(await readError(response, 'Failed to start trip'));
  }

  return response.json();
}

export async function completeTrip(accessToken: string, orderId: string) {
  const response = await authorizedFetch(`/orders/${orderId}/complete`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ paymentMethod: 'CASH' }),
  }, accessToken);

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

export async function fetchDriverRideHistory(
  accessToken: string,
  filter: RideHistoryFilter = 'completed',
): Promise<RideHistoryItem[]> {
  const response = await authorizedFetch(
    `/orders/history/driver?filter=${filter}`,
    {},
    accessToken,
  );

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
  payment?: {
    status?: string;
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
    paymentStatus: ride.payment?.status,
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
