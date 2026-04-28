export type Language = 'ru' | 'uz';

const language: Language = 'ru';

const dictionaries = {
  ru: {
    loginSubtitle: 'Вход или регистрация',
    continue: 'Продолжить',
    tripCompleted: 'Поездка завершена',
    rateTrip: 'Оцените поездку: *****',
    backHome: 'На главный экран',
    currentLocation: 'Текущая позиция',
    map: 'Карта',
    from: 'Откуда',
    to: 'Куда',
    enterDestination: 'Введите адрес назначения',
    selectTariff: 'Выбрать тариф',
    searchingDriver: 'Ищем водителя',
    orderSent: 'Заказ {id} отправлен ближайшим водителям',
    tariffSelection: 'Выбор тарифа',
    economy: 'Эконом',
    comfort: 'Комфорт',
    premium: 'Премиум',
    minutes: '3-5 минут',
    driverComing: 'Водитель едет',
    driverFound: 'Водитель найден',
    driverArrived: 'Водитель на месте',
    tripInProgress: 'Поездка началась',
    eta: 'ETA {minutes} мин',
    cancelOrder: 'Отменить заказ',
    som: 'сум',
  },
  uz: {
    loginSubtitle: 'Kirish yoki ro‘yxatdan o‘tish',
    continue: 'Davom etish',
    tripCompleted: 'Safar yakunlandi',
    rateTrip: 'Safarni baholang: *****',
    backHome: 'Bosh ekranga',
    currentLocation: 'Joriy joylashuv',
    map: 'Xarita',
    from: 'Qayerdan',
    to: 'Qayerga',
    enterDestination: 'Manzilni kiriting',
    selectTariff: 'Tarifni tanlash',
    searchingDriver: 'Haydovchi qidirilmoqda',
    orderSent: 'Buyurtma {id} yaqin haydovchilarga yuborildi',
    tariffSelection: 'Tarif tanlash',
    economy: 'Ekonom',
    comfort: 'Komfort',
    premium: 'Premium',
    minutes: '3-5 daqiqa',
    driverComing: 'Haydovchi kelmoqda',
    driverFound: 'Haydovchi topildi',
    driverArrived: 'Haydovchi yetib keldi',
    tripInProgress: 'Safar boshlandi',
    eta: 'ETA {minutes} daqiqa',
    cancelOrder: 'Buyurtmani bekor qilish',
    som: 'so‘m',
  },
} as const;

type TranslationKey = keyof (typeof dictionaries)['ru'];

export function t(key: TranslationKey, values: Record<string, string | number> = {}) {
  let text: string = dictionaries[language][key];

  for (const [name, value] of Object.entries(values)) {
    text = text.replace(`{${name}}`, String(value));
  }

  return text;
}
