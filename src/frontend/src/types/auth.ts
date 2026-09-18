export type UserRole = 'sre' | 'viewer';

export interface User {
  email: string;
  name: string;
  role: UserRole;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface LoginResponse {
  email: string;
  name: string;
  role: UserRole;
}
