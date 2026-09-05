export interface EmployeeDocument {
  id?: string;
  tenantId?: string;
  employeeId?: string;
  name: string;
  expiryDate: string; // ISO date string YYYY-MM-DD
  createdAt?: string;
}

export interface Employee {
  id?: string;
  tenantId: string;
  branchId?: string;
  branchName?: string; // Virtual UI convenience field
  name: string;
  phone?: string;
  address?: string;
  nationalId?: string;
  jobTitle: string;
  hireDate: string; // ISO date string YYYY-MM-DD
  salary: number;
  documents?: EmployeeDocument[];
  username?: string;
  password?: string;
  endOfServiceDate?: string; // ISO date string YYYY-MM-DD
  createdAt?: string;
}

