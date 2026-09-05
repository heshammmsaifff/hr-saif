import { supabase } from '../../utils/supabase';
import type { Advance } from '../../domain/entities/Advance';
import type { AdvanceRepository } from '../../domain/repositories/AdvanceRepository';

export class SupabaseAdvanceRepository implements AdvanceRepository {
  async getAdvances(tenantId: string): Promise<Advance[]> {
    const { data, error } = await supabase
      .from('employee_advances')
      .select('*, employees(name)')
      .eq('tenant_id', tenantId)
      .order('advance_date', { ascending: false });

    if (error) {
      throw new Error(error.message);
    }

    return (data || []).map((row) => ({
      id: row.id,
      tenantId: row.tenant_id,
      employeeId: row.employee_id,
      employeeName: row.employees?.name || 'موظف محذوف',
      amount: Number(row.amount),
      reason: row.reason,
      advanceDate: row.advance_date,
      createdAt: row.created_at,
    }));
  }

  async createAdvance(advance: Omit<Advance, 'id' | 'createdAt'>): Promise<Advance> {
    const { data, error } = await supabase
      .from('employee_advances')
      .insert({
        tenant_id: advance.tenantId,
        employee_id: advance.employeeId,
        amount: advance.amount,
        reason: advance.reason,
        advance_date: advance.advanceDate,
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
      amount: Number(data.amount),
      reason: data.reason,
      advanceDate: data.advance_date,
      createdAt: data.created_at,
    };
  }

  async deleteAdvance(id: string): Promise<void> {
    const { error } = await supabase
      .from('employee_advances')
      .delete()
      .eq('id', id);

    if (error) {
      throw new Error(error.message);
    }
  }
}
