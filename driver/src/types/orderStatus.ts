export const ORDER_STATUSES = {
  NEW: 'NEW',
  SEARCHING: 'SEARCHING',
  OFFERED: 'OFFERED',
  ACCEPTED: 'ACCEPTED',
  ARRIVING: 'ARRIVING',
  IN_PROGRESS: 'IN_PROGRESS',
  COMPLETED: 'COMPLETED',
  CANCELLED: 'CANCELLED',
} as const;

export type OrderStatus =
  (typeof ORDER_STATUSES)[keyof typeof ORDER_STATUSES];

export function normalizeOrderStatus(status: string): OrderStatus {
  const value = status.trim();
  const upper = value.toUpperCase();

  if (upper === 'CREATED') return ORDER_STATUSES.NEW;
  if (upper === 'SEARCHING_DRIVER') return ORDER_STATUSES.SEARCHING;
  if (upper === 'DRIVER_ASSIGNED') return ORDER_STATUSES.ACCEPTED;
  if (upper === 'DRIVER_ARRIVED') return ORDER_STATUSES.ARRIVING;
  if (upper === 'IN_PROGRESS') return ORDER_STATUSES.IN_PROGRESS;
  if (upper === 'COMPLETED') return ORDER_STATUSES.COMPLETED;
  if (upper === 'CANCELLED') return ORDER_STATUSES.CANCELLED;

  if (upper === 'NEW') return ORDER_STATUSES.NEW;
  if (upper === 'SEARCHING') return ORDER_STATUSES.SEARCHING;
  if (upper === 'OFFERED') return ORDER_STATUSES.OFFERED;
  if (upper === 'ACCEPTED') return ORDER_STATUSES.ACCEPTED;
  if (upper === 'ARRIVING') return ORDER_STATUSES.ARRIVING;

  return ORDER_STATUSES.OFFERED;
}
