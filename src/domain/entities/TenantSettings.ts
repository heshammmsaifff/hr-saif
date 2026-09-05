export interface TenantSettings {
  tenantId: string;
  paidLeavesLimit: number;
  excusedAbsenceDeduction: number; // e.g. 1.0 day(s) deduction per day absent
  unexcusedAbsenceDeduction: number; // e.g. 2.0 day(s) deduction per day absent
  allowEmployeeViewSalary?: boolean;
  allowEmployeeSubmitRequests?: boolean;
}
