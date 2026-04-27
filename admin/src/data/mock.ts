export type OrderStatus =
  | 'SEARCHING_DRIVER'
  | 'DRIVER_ASSIGNED'
  | 'DRIVER_ARRIVED'
  | 'IN_PROGRESS';

export type DriverStatus = 'ONLINE' | 'BUSY' | 'OFFLINE';
export type DocumentStatus = 'VERIFIED' | 'PENDING' | 'REJECTED';

export const statusLabels: Record<OrderStatus, string> = {
  SEARCHING_DRIVER: 'Поиск водителя',
  DRIVER_ASSIGNED: 'Водитель назначен',
  DRIVER_ARRIVED: 'Водитель на месте',
  IN_PROGRESS: 'В поездке',
};

export const activeOrders = [
  {
    id: 'ORD-1024',
    passenger: 'Aziza Karimova',
    driver: 'Jasur Aliyev',
    status: 'IN_PROGRESS' as OrderStatus,
    route: 'Центральный рынок -> 5-й микрорайон',
    fare: 32000,
    eta: '8 мин',
    createdAt: '14:08',
    pickup: 'Центральный рынок',
    destination: '5-й микрорайон',
    lat: 42,
    lng: 36,
  },
  {
    id: 'ORD-1025',
    passenger: 'Otabek Saidov',
    driver: 'Dilshod Umarov',
    status: 'DRIVER_ASSIGNED' as OrderStatus,
    route: 'ЖД вокзал -> Янгиабадская',
    fare: 54000,
    eta: '12 мин',
    createdAt: '14:14',
    pickup: 'ЖД вокзал',
    destination: 'Янгиабадская',
    lat: 64,
    lng: 68,
  },
  {
    id: 'ORD-1026',
    passenger: 'Madina Akramova',
    driver: 'Назначается',
    status: 'SEARCHING_DRIVER' as OrderStatus,
    route: 'Навои шох -> Промзона',
    fare: 41000,
    eta: 'поиск',
    createdAt: '14:17',
    pickup: 'Навои шох',
    destination: 'Промзона',
    lat: 27,
    lng: 58,
  },
  {
    id: 'ORD-1027',
    passenger: 'Sardor Rakhimov',
    driver: 'Nodir Sobirov',
    status: 'DRIVER_ARRIVED' as OrderStatus,
    route: 'Соглом авлод -> Ангрен шахар',
    fare: 26000,
    eta: '2 мин',
    createdAt: '14:22',
    pickup: 'Соглом авлод',
    destination: 'Ангрен шахар',
    lat: 35,
    lng: 74,
  },
];

export const drivers = [
  {
    id: 'DRV-201',
    name: 'Jasur Aliyev',
    phone: '+998 90 123 45 67',
    car: 'Chevrolet Cobalt 01 A 234 BB',
    status: 'BUSY' as DriverStatus,
    rating: 4.9,
    documents: 'VERIFIED' as DocumentStatus,
    blocked: false,
    balance: 420000,
    tripsToday: 9,
    lat: 46,
    lng: 38,
  },
  {
    id: 'DRV-202',
    name: 'Dilshod Umarov',
    phone: '+998 93 555 10 11',
    car: 'Ravon Nexia 01 B 777 CA',
    status: 'ONLINE' as DriverStatus,
    rating: 4.7,
    documents: 'PENDING' as DocumentStatus,
    blocked: false,
    balance: 315000,
    tripsToday: 6,
    lat: 61,
    lng: 63,
  },
  {
    id: 'DRV-203',
    name: 'Rustam Nabiyev',
    phone: '+998 91 888 44 22',
    car: 'Chevrolet Spark 01 X 331 AA',
    status: 'OFFLINE' as DriverStatus,
    rating: 4.2,
    documents: 'REJECTED' as DocumentStatus,
    blocked: true,
    balance: 0,
    tripsToday: 0,
    lat: 22,
    lng: 46,
  },
  {
    id: 'DRV-204',
    name: 'Nodir Sobirov',
    phone: '+998 97 707 70 70',
    car: 'Chevrolet Lacetti 01 H 515 HH',
    status: 'BUSY' as DriverStatus,
    rating: 4.8,
    documents: 'VERIFIED' as DocumentStatus,
    blocked: false,
    balance: 508000,
    tripsToday: 11,
    lat: 31,
    lng: 73,
  },
];

export const tariffs = [
  {
    key: 'economy',
    name: 'Эконом',
    baseFare: 8000,
    perKm: 2500,
    perMinute: 400,
    surge: 1,
    active: true,
  },
  {
    key: 'comfort',
    name: 'Комфорт',
    baseFare: 12000,
    perKm: 3500,
    perMinute: 600,
    surge: 1.15,
    active: true,
  },
  {
    key: 'premium',
    name: 'Премиум',
    baseFare: 20000,
    perKm: 6000,
    perMinute: 900,
    surge: 1.3,
    active: true,
  },
  {
    key: 'delivery',
    name: 'Доставка',
    baseFare: 10000,
    perKm: 3000,
    perMinute: 350,
    surge: 1.05,
    active: false,
  },
];

export const analytics = {
  tripsToday: 318,
  revenueToday: 12480000,
  activeDrivers: 84,
  completionRate: 92,
  acceptanceRate: 86,
  averageCheck: 39200,
  cancelledTrips: 18,
  driverPayouts: 8736000,
};

export const revenueByDay = [
  { day: 'Пн', revenue: 9800000, trips: 241 },
  { day: 'Вт', revenue: 10800000, trips: 266 },
  { day: 'Ср', revenue: 11600000, trips: 289 },
  { day: 'Чт', revenue: 12100000, trips: 301 },
  { day: 'Пт', revenue: 13900000, trips: 344 },
  { day: 'Сб', revenue: 15200000, trips: 377 },
  { day: 'Вс', revenue: 12480000, trips: 318 },
];

export const formatSom = (value: number) => `${value.toLocaleString('ru-RU')} сум`;
