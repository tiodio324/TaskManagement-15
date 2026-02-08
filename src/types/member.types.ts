// Member Types

export type MemberRole = 'developer' | 'designer' | 'qa' | 'lead' | 'manager';

export interface Member {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  role: MemberRole;
  avatarUrl?: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface MemberFormData {
  firstName: string;
  lastName: string;
  email: string;
  role: MemberRole;
  avatarUrl?: string;
}
