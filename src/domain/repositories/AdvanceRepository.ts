import type { Advance } from '../entities/Advance';

export interface AdvanceRepository {
  getAdvances(tenantId: string): Promise<Advance[]>;
  createAdvance(advance: Omit<Advance, 'id' | 'createdAt'>): Promise<Advance>;
  deleteAdvance(id: string): Promise<void>;
}
