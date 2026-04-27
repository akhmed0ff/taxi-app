export type Language = 'ru' | 'uz';

const language: Language = 'ru';

const dictionaries = {
  ru: {
    balance: 'Баланс',
    availablePayout: 'Доступно к выплате',
    commission: 'Комиссия',
    backOnline: 'Вернуться на линию',
    navigation: 'Навигация',
    goingToPickup: 'Едем на подачу',
    openRoute: 'Откройте маршрут в картах',
    maps: 'Карты',
    arrived: 'Я на месте',
    driver: 'Водитель',
    online: 'Вы на линии',
    offline: 'Вы не принимаете заказы',
    goOffline: 'Уйти оффлайн',
    goOnline: 'Выйти онлайн',
    geotracking: 'Геотрекинг',
    trackingOn: 'Координаты отправляются каждые 2-3 секунды',
    trackingOff: 'Включится после выхода онлайн',
    newOrder: 'Новый заказ',
    pickup: 'Подача',
    destination: 'Куда',
    skip: 'Пропустить',
    accept: 'Принять',
    tripInProgress: 'Поездка идет',
    passengerNearby: 'Пассажир рядом',
    drivePassenger: 'Довезите пассажира',
    startTrip: 'Начните поездку',
    complete: 'Завершить',
    start: 'Начать',
    som: 'сум',
  },
  uz: {
    balance: 'Balans',
    availablePayout: 'To‘lovga mavjud',
    commission: 'Komissiya',
    backOnline: 'Liniyaga qaytish',
    navigation: 'Navigatsiya',
    goingToPickup: 'Yo‘lovchi oldiga ketmoqdamiz',
    openRoute: 'Xaritada marshrutni oching',
    maps: 'Xaritalar',
    arrived: 'Men yetib keldim',
    driver: 'Haydovchi',
    online: 'Siz liniyadasiz',
    offline: 'Siz buyurtma qabul qilmayapsiz',
    goOffline: 'Oflaynga chiqish',
    goOnline: 'Onlaynga chiqish',
    geotracking: 'Geotreking',
    trackingOn: 'Koordinatalar har 2-3 soniyada yuboriladi',
    trackingOff: 'Onlaynga chiqqandan keyin yoqiladi',
    newOrder: 'Yangi buyurtma',
    pickup: 'Podaсha',
    destination: 'Qayerga',
    skip: 'O‘tkazib yuborish',
    accept: 'Qabul qilish',
    tripInProgress: 'Safar davom etmoqda',
    passengerNearby: 'Yo‘lovchi yaqin',
    drivePassenger: 'Yo‘lovchini manzilga yetkazing',
    startTrip: 'Safarni boshlang',
    complete: 'Yakunlash',
    start: 'Boshlash',
    som: 'so‘m',
  },
} as const;

type TranslationKey = keyof (typeof dictionaries)['ru'];

export function t(key: TranslationKey) {
  return dictionaries[language][key];
}
