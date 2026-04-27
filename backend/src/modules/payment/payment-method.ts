export const PaymentMethodValue = {
  CASH: 'CASH',
  CARD: 'CARD',
} as const;

export type PaymentMethod =
  (typeof PaymentMethodValue)[keyof typeof PaymentMethodValue];
