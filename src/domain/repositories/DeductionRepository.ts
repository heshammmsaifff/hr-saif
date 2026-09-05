import type { Deduction } from '../entities/Deduction';

export interface DeductionRepository {
  getDeductions(tenantId: string): Promise<Deduction[]>;
  createDeduction(deduction: Omit<Deduction, 'id' | 'createdAt'>): Promise<Deduction>;
  deleteDeduction(id: string): Promise<void>;
}
