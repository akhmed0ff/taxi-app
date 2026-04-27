import { UserRole } from '../roles';

export interface AuthUser {
  userId: string;
  role: UserRole;
}
