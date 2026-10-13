import { UserRole } from '../constants/roles';

export interface User {
  id: number;
  uuid: string;
  username: string;
  display_name: string;
  password_hash: string;
  pin_hash: string | null;
  role: UserRole;
  is_active: number;
  created_at: string;
  last_login?: string | null;
  failed_login_count?: number;
  locked_until?: string | null;
}

export type SafeUser = Omit<User, 'password_hash' | 'pin_hash'>;

export interface Session {
  user: SafeUser;
  token?: string;
  loginAt: string;
}

export interface CreateUserInput {
  username: string;
  display_name: string;
  password?: string;
  pin?: string | null;
  role: UserRole;
}

export interface UpdateUserInput {
  display_name?: string;
  role?: UserRole;
  is_active?: number;
  password?: string;
  pin?: string | null;
}

export interface LoginResult {
  success: boolean;
  user?: SafeUser;
  error?: string;
  lockedUntil?: string | null;
  attemptsRemaining?: number;
}
