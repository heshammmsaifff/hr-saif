export interface Deduction {
  id?: string;
  tenantId: string;
  employeeId: string;
  employeeName?: string; // Virtual UI convenience field
  deductionType: 'amount' | 'days';
  value: number; // Decimal support (e.g. 0.5 or 0.25 day, or monetary value)
  reason: string;
  deductionDate: string; // ISO date string YYYY-MM-DD
  createdAt?: string;
}
