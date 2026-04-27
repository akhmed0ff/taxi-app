export const PaymentStatusValue = {
  PENDING: 'PENDING',
  PAID: 'PAID',
  FAILED: 'FAILED',
  REFUNDED: 'REFUNDED',
} as const;

export type PaymentStatus =
  (typeof PaymentStatusValue)[keyof typeof PaymentStatusValue];
