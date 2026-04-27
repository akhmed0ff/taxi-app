import { OrderStatusValue } from './order-status';

export const RideHistoryFilterValue = {
  ACTIVE: 'active',
  COMPLETED: 'completed',
  CANCELLED: 'cancelled',
} as const;

export type RideHistoryFilter =
  (typeof RideHistoryFilterValue)[keyof typeof RideHistoryFilterValue];

export function getRideStatusesForHistoryFilter(filter?: string) {
  if (filter === RideHistoryFilterValue.ACTIVE) {
    return [
      OrderStatusValue.SEARCHING_DRIVER,
      OrderStatusValue.DRIVER_ASSIGNED,
      OrderStatusValue.DRIVER_ARRIVED,
      OrderStatusValue.IN_PROGRESS,
    ];
  }

  if (filter === RideHistoryFilterValue.COMPLETED) {
    return [OrderStatusValue.COMPLETED];
  }

  if (filter === RideHistoryFilterValue.CANCELLED) {
    return [OrderStatusValue.CANCELLED];
  }

  return undefined;
}
