import type { Branch } from '../entities/Branch';

export interface BranchRepository {
  getBranches(tenantId: string): Promise<Branch[]>;
  createBranch(branch: Omit<Branch, 'id' | 'createdAt'>): Promise<Branch>;
  updateBranch(id: string, branch: Omit<Branch, 'id' | 'createdAt'>): Promise<Branch>;
  deleteBranch(id: string): Promise<void>;
}
