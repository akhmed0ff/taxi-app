import type { activeOrders, drivers } from '@/data/mock';

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3000';

type AdminDriver = (typeof drivers)[number];
type AdminOrder = (typeof activeOrders)[number];

interface BackendUser {
  id: string;
  phone: string;
  name?: string;
}

interface BackendVehicle {
  make: string;
  model: string;
  color: string;
  plateNumber: string;
}

interface BackendDocument {
  verified: boolean;
}

interface BackendDriver {
  id: string;
  status: string;
  rating: number;
  user?: BackendUser;
  vehicle?: BackendVehicle;
  documents?: BackendDocument[];
  rides?: Array<{ createdAt: string }>;
}

interface BackendRide {
  id: string;
  status: AdminOrder['status'];
  pickupLat: number;
  pickupLng: number;
  pickupAddress?: string;
  dropoffAddress?: string;
  estimatedFare?: number;
  finalFare?: number;
  createdAt: string;
  customer?: BackendUser;
  driver?: BackendDriver & { user?: BackendUser };
}

let adminAccessToken: string | undefined;

export async function fetchAdminDrivers() {
  const data = await apiFetch<BackendDriver[]>('/drivers');
  return data.map(mapBackendDriver);
}

export async function fetchActiveOrders() {
  const data = await apiFetch<BackendRide[]>('/orders/active');
  return data.map(mapBackendRide);
}

async function apiFetch<T>(path: string): Promise<T> {
  const accessToken = await getAdminAccessToken();
  const response = await fetch(`${API_URL}${path}`, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });

  if (!response.ok) {
    throw new Error(await readError(response, `Admin API failed: ${path}`));
  }

  return response.json();
}

async function getAdminAccessToken() {
  if (adminAccessToken) {
    return adminAccessToken;
  }

  const response = await fetch(`${API_URL}/auth/dev-login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      phone: process.env.NEXT_PUBLIC_ADMIN_PHONE ?? '+998900000001',
      name: 'Admin Dispatcher',
      role: 'ADMIN',
    }),
  });

  if (!response.ok) {
    throw new Error(await readError(response, 'Admin dev-login failed'));
  }

  const data = await response.json();
  adminAccessToken = data.accessToken;
  return adminAccessToken;
}

function mapBackendDriver(driver: BackendDriver): AdminDriver {
  const documents = driver.documents ?? [];
  const documentStatus =
    documents.length === 0
      ? 'PENDING'
      : documents.every((document) => document.verified)
        ? 'VERIFIED'
        : 'PENDING';
  const status = driver.status === 'BLOCKED' ? 'OFFLINE' : driver.status;

  return {
    id: driver.id,
    name: driver.user?.name ?? 'Driver',
    phone: driver.user?.phone ?? '-',
    car: formatVehicle(driver.vehicle),
    status: isKnownDriverStatus(status) ? status : 'OFFLINE',
    rating: driver.rating ?? 5,
    documents: documentStatus,
    blocked: driver.status === 'BLOCKED',
    balance: 0,
    tripsToday: countTodayTrips(driver.rides ?? []),
    ...stableMapPosition(driver.id),
  };
}

function mapBackendRide(ride: BackendRide): AdminOrder {
  const pickup = ride.pickupAddress ?? 'Pickup';
  const destination = ride.dropoffAddress ?? 'Dropoff';

  return {
    id: ride.id,
    passenger: ride.customer?.name ?? ride.customer?.phone ?? 'Passenger',
    driver: ride.driver?.user?.name ?? 'Назначается',
    status: ride.status,
    route: `${pickup} -> ${destination}`,
    fare: ride.finalFare ?? ride.estimatedFare ?? 0,
    eta: ride.status === 'SEARCHING_DRIVER' ? 'поиск' : '4 мин',
    createdAt: formatTime(ride.createdAt),
    pickup,
    destination,
    ...stableMapPosition(ride.id),
  };
}

function formatVehicle(vehicle?: BackendVehicle) {
  if (!vehicle) {
    return 'Авто не указано';
  }

  return `${vehicle.make} ${vehicle.model} ${vehicle.plateNumber}`;
}

function isKnownDriverStatus(status: string): status is AdminDriver['status'] {
  return status === 'ONLINE' || status === 'BUSY' || status === 'OFFLINE';
}

function countTodayTrips(rides: Array<{ createdAt: string }>) {
  const today = new Date().toDateString();
  return rides.filter((ride) => new Date(ride.createdAt).toDateString() === today).length;
}

function formatTime(value: string) {
  return new Date(value).toLocaleTimeString('ru-RU', {
    hour: '2-digit',
    minute: '2-digit',
  });
}

function stableMapPosition(seed: string) {
  let hash = 0;

  for (const char of seed) {
    hash = (hash * 31 + char.charCodeAt(0)) >>> 0;
  }

  return {
    lat: 18 + (hash % 64),
    lng: 18 + ((hash >> 8) % 64),
  };
}

async function readError(response: Response, fallback: string) {
  const body = await response.text();
  return body ? `${fallback}: ${body}` : fallback;
}
