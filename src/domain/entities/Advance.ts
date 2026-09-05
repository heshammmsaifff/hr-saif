export interface Advance {
  id?: string;
  tenantId: string;
  employeeId: string;
  employeeName?: string; // Virtual UI convenience field
  amount: number;
  reason: string;
  advanceDate: string; // ISO date YYYY-MM-DD
  createdAt?: string;
}
