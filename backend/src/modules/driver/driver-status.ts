export const DriverStatusValue = {
  OFFLINE: 'OFFLINE',
  ONLINE: 'ONLINE',
  BUSY: 'BUSY',
  BLOCKED: 'BLOCKED',
} as const;

export type DriverStatus =
  (typeof DriverStatusValue)[keyof typeof DriverStatusValue];
