export const OrderStatusValue = {
  CREATED: 'CREATED',
  SEARCHING_DRIVER: 'SEARCHING_DRIVER',
  DRIVER_ASSIGNED: 'DRIVER_ASSIGNED',
  DRIVER_ARRIVED: 'DRIVER_ARRIVED',
  IN_PROGRESS: 'IN_PROGRESS',
  COMPLETED: 'COMPLETED',
  CANCELLED: 'CANCELLED',
} as const;

export type OrderStatus =
  (typeof OrderStatusValue)[keyof typeof OrderStatusValue];

export const ORDER_STATUS_FLOW: Record<OrderStatus, OrderStatus[]> = {
  CREATED: [OrderStatusValue.SEARCHING_DRIVER, OrderStatusValue.CANCELLED],
  SEARCHING_DRIVER: [
    OrderStatusValue.DRIVER_ASSIGNED,
    OrderStatusValue.CANCELLED,
  ],
  DRIVER_ASSIGNED: [
    OrderStatusValue.DRIVER_ARRIVED,
    OrderStatusValue.CANCELLED,
  ],
  DRIVER_ARRIVED: [OrderStatusValue.IN_PROGRESS, OrderStatusValue.CANCELLED],
  IN_PROGRESS: [OrderStatusValue.COMPLETED, OrderStatusValue.CANCELLED],
  COMPLETED: [],
  CANCELLED: [],
};
