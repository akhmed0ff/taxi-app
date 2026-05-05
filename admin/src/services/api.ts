const configuredApiUrl = process.env.NEXT_PUBLIC_API_URL;
const appEnv = process.env.NEXT_PUBLIC_APP_ENV ?? 'development';

if (
  appEnv === 'production' &&
  (!configuredApiUrl ||
    configuredApiUrl === 'http://localhost:3000' ||
    configuredApiUrl === 'http://127.0.0.1:3000')
) {
  throw new Error('NEXT_PUBLIC_API_URL must be a real public API URL in production');
}

export const API_URL = configuredApiUrl ?? 'http://localhost:3000';

export type OrderStatus =
  | 'SEARCHING_DRIVER'
  | 'DRIVER_ASSIGNED'
  | 'DRIVER_ARRIVED'
  | 'IN_PROGRESS'
  | 'COMPLETED'
  | 'CANCELLED';

export type DriverStatus = 'ONLINE' | 'BUSY' | 'OFFLINE';
export type DocumentStatus = 'VERIFIED' | 'PENDING' | 'REJECTED';

export interface AdminDriver {
  id: string;
  name: string;
  phone: string;
  car: string;
  status: DriverStatus;
  rating: number;
  documents: DocumentStatus;
  blocked: boolean;
  balance: number;
  tripsToday: number;
  lat: number;
  lng: number;
}

export interface AdminOrder {
  id: string;
  passenger: string;
  driver: string;
  status: OrderStatus;
  route: string;
  fare: number;
  eta: string;
  createdAt: string;
  pickup: string;
  destination: string;
  lat: number;
  lng: number;
}

export interface AdminTariff {
  key: string;
  name: string;
  title: string;
  sortOrder: number;
  etaMinutes: number;
  seats: number;
  pricePer100m?: number | null;
  baseFare: number;
  perKm: number;
  perMinute: number;
  minimumFare: number;
  freeWaitingMinutes: number;
  stopPerMinute: number;
  surge: number;
  active: boolean;
}

export interface AdminAnalyticsSummary {
  tripsToday: number;
  revenueToday: number;
  activeDrivers: number;
  completionRate: number;
  acceptanceRate: number;
  averageCheck: number;
  cancelledTrips: number;
  driverPayouts: number;
  revenueByDay: Array<{ day: string; revenue: number; trips: number }>;
  tariffs: AdminTariff[];
}

export interface AdminRideDetails extends AdminOrder {
  customerPhone: string;
  driverPhone: string;
  tariffClass: string;
  distanceKm: number;
  waitingMinutes: number;
  stopMinutes: number;
  cancelReason?: string;
  paymentStatus: string;
  paymentMethod: string;
  statusHistory: Array<{
    status: string;
    reason?: string;
    createdAt: string;
  }>;
}

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

interface PaginatedBackendDrivers {
  data: BackendDriver[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

interface BackendRide {
  id: string;
  status: OrderStatus;
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
  cancelReason?: string;
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
  title: string;
  sortOrder: number;
  etaMinutes: number;
  seats: number;
  pricePer100m?: number | null;
  baseFare: number;
  perKm: number;
  freeWaitingMinutes: number;
  waitingPerMinute: number;
  stopPerMinute: number;
  minimumFare: number;
  active: boolean;
}

export const statusLabels: Record<OrderStatus, string> = {
  SEARCHING_DRIVER: 'Поиск водителя',
  DRIVER_ASSIGNED: 'Водитель назначен',
  DRIVER_ARRIVED: 'Водитель на месте',
  IN_PROGRESS: 'В поездке',
  COMPLETED: 'Завершена',
  CANCELLED: 'Отменена',
};

let adminAccessToken: string | undefined;

export interface AdminDriversPage {
  data: AdminDriver[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export async function fetchAdminDriversPage(page = 1, limit = 20): Promise<AdminDriversPage> {
  const params = new URLSearchParams({
    page: String(page),
    limit: String(limit),
  });
  const data = await apiFetch<PaginatedBackendDrivers>(`/drivers?${params.toString()}`);

  return {
    ...data,
    data: data.data.map(mapBackendDriver),
  };
}

export async function fetchAdminDrivers() {
  const page = await fetchAdminDriversPage(1, 100);
  return page.data;
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

export async function fetchAdminAnalytics(): Promise<AdminAnalyticsSummary> {
  const [orders, driverList, tariffList] = await Promise.all([
    fetchActiveOrders(),
    fetchAdminDrivers(),
    fetchTariffs(),
  ]);

  return buildBasicAnalytics(orders, driverList, tariffList);
}

export async function saveTariff(tariff: AdminTariff) {
  const data = await apiFetch<BackendTariff>(`/admin/tariffs/${tariff.key}`, {
    method: 'PATCH',
    body: JSON.stringify({
      city: 'Angren',
      tariffClass: normalizeTariffClass(tariff.name),
      title: tariff.title,
      sortOrder: tariff.sortOrder,
      etaMinutes: tariff.etaMinutes,
      seats: tariff.seats,
      pricePer100m: tariff.pricePer100m ?? undefined,
      baseFare: tariff.baseFare,
      perKm: tariff.perKm,
      freeWaitingMinutes: tariff.freeWaitingMinutes,
      waitingPerMinute: tariff.perMinute,
      stopPerMinute: tariff.stopPerMinute,
      minimumFare: tariff.minimumFare,
      active: tariff.active,
    }),
  });

  return mapBackendTariff(data);
}

export async function getAdminAccessToken() {
  if (adminAccessToken) {
    return adminAccessToken;
  }

  const phone = process.env.NEXT_PUBLIC_ADMIN_PHONE ?? '+998900000001';
  const password = process.env.NEXT_PUBLIC_ADMIN_PASSWORD ?? 'password123';
  const loginResponse = await fetch(`${API_URL}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ phone, password }),
  });

  if (loginResponse.ok) {
    const data = await loginResponse.json();
    adminAccessToken = data.accessToken;
    return adminAccessToken;
  }

  const devLoginResponse = await fetch(`${API_URL}/auth/dev-login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      phone,
      name: 'Admin Dispatcher',
      role: 'ADMIN',
    }),
  });

  if (!devLoginResponse.ok) {
    throw new Error(await readError(devLoginResponse, 'Admin login failed'));
  }

  const data = await devLoginResponse.json();
  adminAccessToken = data.accessToken;
  return adminAccessToken;
}

export function formatSom(value: number) {
  return `${value.toLocaleString('ru-RU')} сум`;
}

export function mapGeoToPanelPosition(lat: number, lng: number) {
  const bounds = {
    minLat: 40.93,
    maxLat: 41.1,
    minLng: 70.04,
    maxLng: 70.24,
  };

  const top =
    100 - ((lat - bounds.minLat) / (bounds.maxLat - bounds.minLat)) * 100;
  const left = ((lng - bounds.minLng) / (bounds.maxLng - bounds.minLng)) * 100;

  return {
    lat: clamp(top, 8, 92),
    lng: clamp(left, 8, 92),
  };
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
    name: driver.user?.name ?? 'Водитель',
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
  const pickup = ride.pickupAddress ?? 'Точка подачи';
  const destination = ride.dropoffAddress ?? 'Точка назначения';

  return {
    id: ride.id,
    passenger: ride.customer?.name ?? ride.customer?.phone ?? 'Пассажир',
    driver: ride.driver?.user?.name ?? 'Назначается',
    status: ride.status,
    route: `${pickup} -> ${destination}`,
    fare: ride.finalFare ?? ride.estimatedFare ?? 0,
    eta: ride.status === 'SEARCHING_DRIVER' ? 'поиск' : 'live',
    createdAt: formatTime(ride.createdAt),
    pickup,
    destination,
    ...mapGeoToPanelPosition(ride.pickupLat, ride.pickupLng),
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
    cancelReason: ride.cancelReason,
    paymentStatus: ride.payment?.status ?? '-',
    paymentMethod: ride.payment?.method ?? '-',
    statusHistory: ride.statusHistory ?? [],
  };
}

function mapBackendTariff(tariff: BackendTariff): AdminTariff {
  return {
    key: tariff.id,
    name: tariff.tariffClass,
    title: tariff.title?.trim() ? tariff.title : tariff.tariffClass,
    sortOrder: tariff.sortOrder ?? 0,
    etaMinutes: tariff.etaMinutes ?? 5,
    seats: tariff.seats ?? 4,
    pricePer100m: tariff.pricePer100m ?? null,
    baseFare: tariff.baseFare,
    perKm: tariff.perKm,
    perMinute: tariff.waitingPerMinute,
    minimumFare: tariff.minimumFare,
    freeWaitingMinutes: tariff.freeWaitingMinutes,
    stopPerMinute: tariff.stopPerMinute,
    surge: 1,
    active: tariff.active,
  };
}

const KNOWN_TARIFF_CODES = new Set([
  'STANDARD',
  'COMFORT',
  'COMFORT_PLUS',
  'DELIVERY',
]);

function normalizeTariffClass(name: string) {
  const value = name.toUpperCase().trim();

  if (KNOWN_TARIFF_CODES.has(value)) {
    return value;
  }

  if (value.includes('COMFORT') && value.includes('PLUS')) {
    return 'COMFORT_PLUS';
  }

  if (value.includes('COMFORT') || value.includes('КОМФОРТ')) {
    return 'COMFORT';
  }

  if (value.includes('DELIVERY') || value.includes('ДОСТАВК')) {
    return 'DELIVERY';
  }

  if (value.includes('PREMIUM') || value.includes('ПРЕМИУМ')) {
    return 'COMFORT_PLUS';
  }

  if (value.includes('ECONOMY') || value.includes('STANDARD')) {
    return 'STANDARD';
  }

  return 'STANDARD';
}

function formatVehicle(vehicle?: BackendVehicle) {
  if (!vehicle) {
    return 'Авто не указано';
  }

  return `${vehicle.make} ${vehicle.model} ${vehicle.plateNumber}`;
}

function isKnownDriverStatus(status: string): status is DriverStatus {
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

function buildBasicAnalytics(
  orders: AdminOrder[],
  driverList: AdminDriver[],
  tariffList: AdminTariff[],
): AdminAnalyticsSummary {
  const revenueToday = orders.reduce((sum, order) => sum + order.fare, 0);
  const acceptedOrders = orders.filter(
    (order) => order.status !== 'SEARCHING_DRIVER',
  ).length;
  const inProgressOrders = orders.filter(
    (order) => order.status === 'IN_PROGRESS',
  ).length;
  const activeDrivers = driverList.filter(
    (driver) => driver.status !== 'OFFLINE',
  ).length;
  const averageCheck =
    orders.length > 0 ? Math.round(revenueToday / orders.length) : 0;
  const acceptanceRate =
    orders.length > 0 ? Math.round((acceptedOrders / orders.length) * 100) : 0;
  const completionRate =
    orders.length > 0 ? Math.round((inProgressOrders / orders.length) * 100) : 0;
  const todayLabel = new Date().toLocaleDateString('ru-RU', {
    weekday: 'short',
  });

  return {
    tripsToday: orders.length,
    revenueToday,
    activeDrivers,
    completionRate,
    acceptanceRate,
    averageCheck,
    cancelledTrips: 0,
    driverPayouts: Math.round(revenueToday * 0.7),
    revenueByDay: [
      {
        day: todayLabel,
        revenue: revenueToday,
        trips: orders.length,
      },
    ],
    tariffs: tariffList,
  };
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

async function readError(response: Response, fallback: string) {
  const body = await response.text();
  return body ? `${fallback}: ${body}` : fallback;
}
