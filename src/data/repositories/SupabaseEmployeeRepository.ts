import { supabase } from '../../utils/supabase';
import type { Employee, EmployeeDocument } from '../../domain/entities/Employee';
import type { EmployeeRepository } from '../../domain/repositories/EmployeeRepository';

export class SupabaseEmployeeRepository implements EmployeeRepository {
  async getEmployees(tenantId: string): Promise<Employee[]> {
    const { data, error } = await supabase
      .from('employees')
      .select('*, branches(name), employee_documents(*)')
      .eq('tenant_id', tenantId)
      .order('created_at', { ascending: false });

    if (error) {
      throw new Error(error.message);
    }

    return (data || []).map((row) => ({
      id: row.id,
      tenantId: row.tenant_id,
      branchId: row.branch_id,
      branchName: row.branches?.name || 'بدون فرع',
      name: row.name,
      phone: row.phone,
      address: row.address,
      nationalId: row.national_id,
      jobTitle: row.job_title,
      hireDate: row.hire_date,
      salary: Number(row.salary),
      username: row.username,
      password: row.password,
      endOfServiceDate: row.end_of_service_date,
      createdAt: row.created_at,
      documents: (row.employee_documents || []).map((doc: any) => ({
        id: doc.id,
        tenantId: doc.tenant_id,
        employeeId: doc.employee_id,
        name: doc.name,
        expiryDate: doc.expiry_date,
        createdAt: doc.created_at,
      })),
    }));
  }

  async createEmployee(
    employee: Omit<Employee, 'id' | 'createdAt' | 'branchName' | 'documents'>,
    documents: Omit<EmployeeDocument, 'id' | 'employeeId' | 'tenantId' | 'createdAt'>[]
  ): Promise<Employee> {
    // 1. Insert Employee first
    const { data: employeeData, error: employeeError } = await supabase
      .from('employees')
      .insert({
        tenant_id: employee.tenantId,
        branch_id: employee.branchId || null,
        name: employee.name,
        phone: employee.phone || null,
        address: employee.address || null,
        national_id: employee.nationalId || null,
        job_title: employee.jobTitle,
        hire_date: employee.hireDate,
        salary: employee.salary,
        username: employee.username || null,
        password: employee.password || null,
        end_of_service_date: employee.endOfServiceDate || null,
      })
      .select()
      .single();

    if (employeeError) {
      throw new Error(employeeError.message);
    }

    const employeeId = employeeData.id;

    // 2. Insert Documents if any
    const insertedDocs: EmployeeDocument[] = [];
    if (documents && documents.length > 0) {
      const docPayloads = documents.map((doc) => ({
        tenant_id: employee.tenantId,
        employee_id: employeeId,
        name: doc.name,
        expiry_date: doc.expiryDate,
      }));

      const { data: docsData, error: docsError } = await supabase
        .from('employee_documents')
        .insert(docPayloads)
        .select();

      if (docsError) {
        // Cleanup created employee to simulate transactional integrity
        await supabase.from('employees').delete().eq('id', employeeId);
        throw new Error(docsError.message);
      }

      if (docsData) {
        docsData.forEach((d) => {
          insertedDocs.push({
            id: d.id,
            tenantId: d.tenant_id,
            employeeId: d.employee_id,
            name: d.name,
            expiryDate: d.expiry_date,
            createdAt: d.created_at,
          });
        });
      }
    }

    return {
      id: employeeData.id,
      tenantId: employeeData.tenant_id,
      branchId: employeeData.branch_id,
      name: employeeData.name,
      phone: employeeData.phone,
      address: employeeData.address,
      nationalId: employeeData.national_id,
      jobTitle: employeeData.job_title,
      hireDate: employeeData.hire_date,
      salary: Number(employeeData.salary),
      username: employeeData.username,
      password: employeeData.password,
      endOfServiceDate: employeeData.end_of_service_date,
      createdAt: employeeData.created_at,
      documents: insertedDocs,
    };
  }

  async updateEmployee(
    id: string,
    employee: Omit<Employee, 'id' | 'createdAt' | 'branchName' | 'documents'>,
    documents: Omit<EmployeeDocument, 'id' | 'employeeId' | 'tenantId' | 'createdAt'>[]
  ): Promise<Employee> {
    // 1. Update Core Employee Details
    const { data: employeeData, error: employeeError } = await supabase
      .from('employees')
      .update({
        branch_id: employee.branchId || null,
        name: employee.name,
        phone: employee.phone || null,
        address: employee.address || null,
        national_id: employee.nationalId || null,
        job_title: employee.jobTitle,
        hire_date: employee.hireDate,
        salary: employee.salary,
        username: employee.username || null,
        password: employee.password || null,
        end_of_service_date: employee.endOfServiceDate || null,
      })
      .eq('id', id)
      .select()
      .single();

    if (employeeError) {
      throw new Error(employeeError.message);
    }

    // 2. Delete Existing Documents
    const { error: deleteDocsError } = await supabase
      .from('employee_documents')
      .delete()
      .eq('employee_id', id);

    if (deleteDocsError) {
      throw new Error(deleteDocsError.message);
    }

    // 3. Insert New Documents if any
    const insertedDocs: EmployeeDocument[] = [];
    if (documents && documents.length > 0) {
      const docPayloads = documents.map((doc) => ({
        tenant_id: employee.tenantId,
        employee_id: id,
        name: doc.name,
        expiry_date: doc.expiryDate,
      }));

      const { data: docsData, error: docsError } = await supabase
        .from('employee_documents')
        .insert(docPayloads)
        .select();

      if (docsError) {
        throw new Error(docsError.message);
      }

      if (docsData) {
        docsData.forEach((d) => {
          insertedDocs.push({
            id: d.id,
            tenantId: d.tenant_id,
            employeeId: d.employee_id,
            name: d.name,
            expiryDate: d.expiry_date,
            createdAt: d.created_at,
          });
        });
      }
    }

    return {
      id: employeeData.id,
      tenantId: employeeData.tenant_id,
      branchId: employeeData.branch_id,
      name: employeeData.name,
      phone: employeeData.phone,
      address: employeeData.address,
      nationalId: employeeData.national_id,
      jobTitle: employeeData.job_title,
      hireDate: employeeData.hire_date,
      salary: Number(employeeData.salary),
      username: employeeData.username,
      password: employeeData.password,
      endOfServiceDate: employeeData.end_of_service_date,
      createdAt: employeeData.created_at,
      documents: insertedDocs,
    };
  }

  async deleteEmployee(id: string): Promise<void> {
    const { error } = await supabase
      .from('employees')
      .delete()
      .eq('id', id);

    if (error) {
      throw new Error(error.message);
    }
  }
}
