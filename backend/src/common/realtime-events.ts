export const RealtimeEvent = {
  NEW_ORDER: 'NEW_ORDER',
  DRIVER_ACCEPTED: 'DRIVER_ACCEPTED',
  DRIVER_LOCATION: 'DRIVER_LOCATION',
  TRIP_STARTED: 'TRIP_STARTED',
  TRIP_COMPLETED: 'TRIP_COMPLETED',
  MATCHING_FAILED: 'MATCHING_FAILED',
  PAYMENT_COMPLETED: 'PAYMENT_COMPLETED',
} as const;

export type RealtimeEventName =
  (typeof RealtimeEvent)[keyof typeof RealtimeEvent];
