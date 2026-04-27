export const UserRoleValue = {
  PASSENGER: 'PASSENGER',
  DRIVER: 'DRIVER',
  ADMIN: 'ADMIN',
} as const;

export type UserRole = (typeof UserRoleValue)[keyof typeof UserRoleValue];
