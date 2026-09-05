import type { Employee, EmployeeDocument } from '../entities/Employee';

export interface EmployeeRepository {
  getEmployees(tenantId: string): Promise<Employee[]>;
  createEmployee(
    employee: Omit<Employee, 'id' | 'createdAt' | 'branchName' | 'documents'>,
    documents: Omit<EmployeeDocument, 'id' | 'employeeId' | 'tenantId' | 'createdAt'>[]
  ): Promise<Employee>;
  updateEmployee(
    id: string,
    employee: Omit<Employee, 'id' | 'createdAt' | 'branchName' | 'documents'>,
    documents: Omit<EmployeeDocument, 'id' | 'employeeId' | 'tenantId' | 'createdAt'>[]
  ): Promise<Employee>;
  deleteEmployee(id: string): Promise<void>;
}
