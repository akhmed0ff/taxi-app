export const OrderStatus = {
  NEW: 'NEW',
  SEARCHING: 'SEARCHING',
  OFFERED: 'OFFERED',
  ACCEPTED: 'ACCEPTED',
  ARRIVING: 'ARRIVING',
  IN_PROGRESS: 'IN_PROGRESS',
  COMPLETED: 'COMPLETED',
  CANCELLED: 'CANCELLED',
} as const;

// eslint-disable-next-line no-redeclare -- в TS это один экспорт: значение + тип с одним именем
export type OrderStatus = (typeof OrderStatus)[keyof typeof OrderStatus];

export function normalizeOrderStatus(status: string): OrderStatus {
  const value = status.trim();
  const upper = value.toUpperCase();

  // Backend canonical statuses
  if (upper === 'CREATED') return OrderStatus.NEW;
  if (upper === 'SEARCHING_DRIVER') return OrderStatus.SEARCHING;
  if (upper === 'DRIVER_ASSIGNED') return OrderStatus.ACCEPTED;
  if (upper === 'DRIVER_ARRIVED') return OrderStatus.ARRIVING;
  if (upper === 'IN_PROGRESS') return OrderStatus.IN_PROGRESS;
  if (upper === 'COMPLETED') return OrderStatus.COMPLETED;
  if (upper === 'CANCELLED') return OrderStatus.CANCELLED;

  // Legacy / UI states
  if (upper === 'NEW') return OrderStatus.NEW;
  if (upper === 'SEARCHING') return OrderStatus.SEARCHING;
  if (upper === 'OFFERED') return OrderStatus.OFFERED;
  if (upper === 'ACCEPTED') return OrderStatus.ACCEPTED;
  if (upper === 'ARRIVING') return OrderStatus.ARRIVING;

  return OrderStatus.NEW;
}

