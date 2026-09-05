import { supabase } from '../../utils/supabase';
import type { Deduction } from '../../domain/entities/Deduction';
import type { DeductionRepository } from '../../domain/repositories/DeductionRepository';

export class SupabaseDeductionRepository implements DeductionRepository {
  async getDeductions(tenantId: string): Promise<Deduction[]> {
    const { data, error } = await supabase
      .from('employee_deductions')
      .select('*, employees(name)')
      .eq('tenant_id', tenantId)
      .order('deduction_date', { ascending: false });

    if (error) {
      throw new Error(error.message);
    }

    return (data || []).map((row) => ({
      id: row.id,
      tenantId: row.tenant_id,
      employeeId: row.employee_id,
      employeeName: row.employees?.name || 'موظف محذوف',
      deductionType: row.deduction_type as 'amount' | 'days',
      value: Number(row.value),
      reason: row.reason,
      deductionDate: row.deduction_date,
      createdAt: row.created_at,
    }));
  }

  async createDeduction(deduction: Omit<Deduction, 'id' | 'createdAt'>): Promise<Deduction> {
    const { data, error } = await supabase
      .from('employee_deductions')
      .insert({
        tenant_id: deduction.tenantId,
        employee_id: deduction.employeeId,
        deduction_type: deduction.deductionType,
        value: deduction.value,
        reason: deduction.reason,
        deduction_date: deduction.deductionDate,
      })
      .select()
      .single();

    if (error) {
      throw new Error(error.message);
    }

    return {
      id: data.id,
      tenantId: data.tenant_id,
      employeeId: data.employee_id,
      deductionType: data.deduction_type as 'amount' | 'days',
      value: Number(data.value),
      reason: data.reason,
      deductionDate: data.deduction_date,
      createdAt: data.created_at,
    };
  }

  async deleteDeduction(id: string): Promise<void> {
    const { error } = await supabase
      .from('employee_deductions')
      .delete()
      .eq('id', id);

    if (error) {
      throw new Error(error.message);
    }
  }
}
