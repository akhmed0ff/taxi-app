export const RideOfferStatusValue = {
  PENDING: 'PENDING',
  SENT: 'SENT',
  ACKED: 'ACKED',
  ACCEPTED: 'ACCEPTED',
  REJECTED: 'REJECTED',
  EXPIRED: 'EXPIRED',
  DELIVERY_FAILED: 'DELIVERY_FAILED',
} as const;

export type RideOfferStatus =
  (typeof RideOfferStatusValue)[keyof typeof RideOfferStatusValue];
