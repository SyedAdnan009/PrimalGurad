export type Role = 'admin' | 'analyst' | 'viewer';

export interface User {
  username: string;
  role: Role;
  active?: boolean;
  lastLogin?: string;
}

export interface UserInternal extends User {
  hashedPassword: string;
  active: boolean;
  createdAt: string;
}

export interface CreateUserRequest {
  username: string;
  password: string;
  role: Role;
}

export interface UpdateUserRequest {
  role?: Role;
  active?: boolean;
}

export interface ResetPasswordRequest {
  newPassword: string;
}

export interface LoginForm {
  username: string;
  password: string;
}

export interface AuthResponse {
  access_token: string;
  token_type: string;
  role: Role;
  user: User;
}

export interface ApiError {
  detail: string;
}