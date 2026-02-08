// User & Authentication Types

export type UserRole = 'viewer' | 'developer' | 'admin';

export interface User {
  id?: string;
  role: UserRole;
  name?: string;
  email?: string;
}

export interface AuthCredentials {
  password: string;
}

export interface AuthState {
  isAuthenticated: boolean;
  user: User;
  loginModalOpen: boolean;
}

export const ROLE_PERMISSIONS = {
  viewer: {
    canViewTasks: true,
    canViewProjects: true,
    canViewSprints: true,
    canCreateTasks: false,
    canEditTasks: false,
    canManageProjects: false,
    canManageSprints: false,
    canManageMembers: false,
    canAccessAdmin: false,
  },
  developer: {
    canViewTasks: true,
    canViewProjects: true,
    canViewSprints: true,
    canCreateTasks: true,
    canEditTasks: true,
    canManageProjects: false,
    canManageSprints: false,
    canManageMembers: false,
    canAccessAdmin: false,
  },
  admin: {
    canViewTasks: true,
    canViewProjects: true,
    canViewSprints: true,
    canCreateTasks: true,
    canEditTasks: true,
    canManageProjects: true,
    canManageSprints: true,
    canManageMembers: true,
    canAccessAdmin: true,
  },
} as const;

export type RolePermissions = typeof ROLE_PERMISSIONS[UserRole];
