import type { TenantSettings } from '../entities/TenantSettings';

export interface TenantSettingsRepository {
  getSettings(tenantId: string): Promise<TenantSettings>;
  saveSettings(settings: TenantSettings): Promise<TenantSettings>;
}
