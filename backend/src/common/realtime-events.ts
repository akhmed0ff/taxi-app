export const RealtimeEvent = {
  RIDE_NEW_ORDER: 'ride.new_order',
  RIDE_OFFER: 'ride.offer',
  RIDE_DRIVER_ASSIGNED: 'ride.driver_assigned',
  RIDE_DRIVER_ARRIVED: 'ride.driver_arrived',
  RIDE_STARTED: 'ride.started',
  RIDE_COMPLETED: 'ride.completed',
  RIDE_CANCELLED_UNIFIED: 'ride.cancelled',
  RIDE_MATCHING_FAILED: 'ride.matching_failed',
  NEW_ORDER: 'NEW_ORDER',
  NEW_RIDE_OFFER_LOWER: 'new_ride_offer',
  DRIVER_ACCEPTED: 'DRIVER_ACCEPTED',
  DRIVER_ASSIGNED_LOWER: 'driver_assigned',
  DRIVER_ARRIVED: 'DRIVER_ARRIVED',
  DRIVER_ARRIVED_LOWER: 'driver_arrived',
  DRIVER_LOCATION: 'DRIVER_LOCATION',
  TRIP_STARTED: 'TRIP_STARTED',
  RIDE_STARTED_LOWER: 'ride_started',
  TRIP_COMPLETED: 'TRIP_COMPLETED',
  RIDE_COMPLETED_LOWER: 'ride_completed',
  RIDE_CANCELLED: 'RIDE_CANCELLED',
  MATCHING_FAILED: 'MATCHING_FAILED',
  PAYMENT_COMPLETED: 'PAYMENT_COMPLETED',
  ORDER_UPDATED: 'ORDER_UPDATED',
  DRIVER_UPDATED: 'DRIVER_UPDATED',
} as const;

export type RealtimeEventName =
  (typeof RealtimeEvent)[keyof typeof RealtimeEvent];
