import type { UserProfile, UserRole } from "../../domain/entities/User";

export class UserMapper {
  static toDomain(raw: any): UserProfile {
    if (!raw) {
      throw new Error("Raw data is required to map UserProfile");
    }
    return {
      id: raw.id,
      email: raw.email,
      name: raw.name || null,
      role: (raw.role as UserRole) || "employee",
      tenantId: raw.tenant_id || raw.tenantId || null,
      createdAt: raw.created_at || raw.createdAt || new Date().toISOString(),
    };
  }
}
