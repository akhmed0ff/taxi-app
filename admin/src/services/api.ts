import type { activeOrders, drivers, tariffs } from '@/data/mock';

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3000';

type AdminDriver = (typeof drivers)[number];
type AdminOrder = (typeof activeOrders)[number];
type AdminTariff = (typeof tariffs)[number];

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
  tariffClass?: string;
  distanceMeters?: number;
  waitingMinutes?: number;
  stopMinutes?: number;
  createdAt: string;
  customer?: BackendUser;
  driver?: BackendDriver & { user?: BackendUser };
  payment?: {
    status: string;
    method: string;
    amount: number;
  };
  statusHistory?: Array<{
    status: string;
    reason?: string;
    createdAt: string;
  }>;
}

interface BackendTariff {
  id: string;
  city: string;
  tariffClass: string;
  baseFare: number;
  perKm: number;
  freeWaitingMinutes: number;
  waitingPerMinute: number;
  stopPerMinute: number;
  minimumFare: number;
  active: boolean;
}

let adminAccessToken: string | undefined;

export interface AdminRideDetails extends AdminOrder {
  customerPhone: string;
  driverPhone: string;
  tariffClass: string;
  distanceKm: number;
  waitingMinutes: number;
  stopMinutes: number;
  paymentStatus: string;
  paymentMethod: string;
  statusHistory: Array<{
    status: string;
    reason?: string;
    createdAt: string;
  }>;
}

export async function fetchAdminDrivers() {
  const data = await apiFetch<BackendDriver[]>('/drivers');
  return data.map(mapBackendDriver);
}

export async function fetchActiveOrders() {
  const data = await apiFetch<BackendRide[]>('/orders/active');
  return data.map(mapBackendRide);
}

export async function fetchRideDetails(rideId: string) {
  const data = await apiFetch<BackendRide>(`/orders/${rideId}`);
  return mapBackendRideDetails(data);
}

export async function fetchTariffs() {
  const data = await apiFetch<BackendTariff[]>('/admin/tariffs');
  return data.map(mapBackendTariff);
}

export async function saveTariff(tariff: AdminTariff) {
  const data = await apiFetch<BackendTariff>(`/admin/tariffs/${tariff.key}`, {
    method: 'PATCH',
    body: JSON.stringify({
      city: tariff.name,
      tariffClass: normalizeTariffClass(tariff.name),
      baseFare: tariff.baseFare,
      perKm: tariff.perKm,
      freeWaitingMinutes: 3,
      waitingPerMinute: tariff.perMinute,
      stopPerMinute: 500,
      minimumFare: Math.max(tariff.baseFare, 12000),
      active: tariff.active,
    }),
  });

  return mapBackendTariff(data);
}

async function apiFetch<T>(path: string, init: RequestInit = {}): Promise<T> {
  const accessToken = await getAdminAccessToken();
  const response = await fetch(`${API_URL}${path}`, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${accessToken}`,
      ...init.headers,
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

  const phone = process.env.NEXT_PUBLIC_ADMIN_PHONE ?? '+998900000001';
  const password = process.env.NEXT_PUBLIC_ADMIN_PASSWORD ?? 'password123';
  const registerResponse = await fetch(`${API_URL}/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      phone,
      password,
      name: 'Admin Dispatcher',
      role: 'ADMIN',
    }),
  });

  if (registerResponse.ok) {
    const data = await registerResponse.json();
    adminAccessToken = data.accessToken;
    return adminAccessToken;
  }

  if (registerResponse.status !== 409) {
    throw new Error(await readError(registerResponse, 'Admin register failed'));
  }

  const loginResponse = await fetch(`${API_URL}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      phone,
      password,
    }),
  });

  if (!loginResponse.ok) {
    throw new Error(await readError(loginResponse, 'Admin login failed'));
  }

  const data = await loginResponse.json();
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

function mapBackendRideDetails(ride: BackendRide): AdminRideDetails {
  return {
    ...mapBackendRide(ride),
    customerPhone: ride.customer?.phone ?? '-',
    driverPhone: ride.driver?.user?.phone ?? '-',
    tariffClass: ride.tariffClass ?? 'ECONOMY',
    distanceKm: Math.round(((ride.distanceMeters ?? 0) / 1000) * 10) / 10,
    waitingMinutes: ride.waitingMinutes ?? 0,
    stopMinutes: ride.stopMinutes ?? 0,
    paymentStatus: ride.payment?.status ?? '-',
    paymentMethod: ride.payment?.method ?? '-',
    statusHistory: ride.statusHistory ?? [],
  };
}

function mapBackendTariff(tariff: BackendTariff): AdminTariff {
  return {
    key: tariff.id,
    name: tariff.tariffClass,
    baseFare: tariff.baseFare,
    perKm: tariff.perKm,
    perMinute: tariff.waitingPerMinute,
    surge: 1,
    active: tariff.active,
  };
}

function normalizeTariffClass(name: string) {
  const value = name.toUpperCase();

  if (value.includes('COMFORT') || value.includes('КОМФОРТ')) {
    return 'COMFORT';
  }

  if (value.includes('PREMIUM') || value.includes('ПРЕМИУМ')) {
    return 'PREMIUM';
  }

  return 'ECONOMY';
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
