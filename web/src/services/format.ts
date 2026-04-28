import { RideStatus } from './types';

export const statusLabels: Record<RideStatus, string> = {
  SEARCHING_DRIVER: 'Ищем водителя',
  DRIVER_ASSIGNED: 'Водитель назначен',
  DRIVER_ARRIVED: 'Водитель приехал',
  IN_PROGRESS: 'Поездка началась',
  COMPLETED: 'Поездка завершена',
  CANCELLED: 'Заказ отменён',
};

export const tariffLabels = {
  ECONOMY: 'Эконом',
  COMFORT: 'Комфорт',
  PREMIUM: 'Премиум',
} as const;

export function formatSom(value?: number | null) {
  if (!value) {
    return '—';
  }

  return `${value.toLocaleString('ru-RU')} сум`;
}

export function formatDate(value: string) {
  return new Date(value).toLocaleString('ru-RU', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function routeLabel(pickup?: string, dropoff?: string) {
  return `${pickup || 'Точка подачи'} → ${dropoff || 'Точка назначения'}`;
}
