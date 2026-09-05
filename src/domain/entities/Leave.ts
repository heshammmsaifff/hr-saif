export interface Leave {
  id?: string;
  tenantId: string;
  employeeId: string;
  employeeName?: string; // Virtual UI convenience field
  leaveType: 'paid_leave' | 'excused_absence' | 'unexcused_absence';
  days: number; // Support decimals (e.g. 0.5)
  reason: string;
  startDate: string; // ISO date YYYY-MM-DD
  endDate: string; // ISO date YYYY-MM-DD
  createdAt?: string;
}
