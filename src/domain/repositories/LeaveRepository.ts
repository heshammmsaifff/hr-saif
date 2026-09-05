import type { Leave } from '../entities/Leave';

export interface LeaveRepository {
  getLeaves(tenantId: string): Promise<Leave[]>;
  createLeave(leave: Omit<Leave, 'id' | 'createdAt'>): Promise<Leave>;
  deleteLeave(id: string): Promise<void>;
}
