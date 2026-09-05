export type UserRole = 'super_admin' | 'tenant_admin' | 'employee';

export interface UserProfile {
  id: string;
  email: string;
  name: string | null;
  role: UserRole;
  tenantId: string | null;
  createdAt: string;
}
