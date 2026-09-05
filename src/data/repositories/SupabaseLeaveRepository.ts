import { supabase } from '../../utils/supabase';
import type { Leave } from '../../domain/entities/Leave';
import type { LeaveRepository } from '../../domain/repositories/LeaveRepository';

export class SupabaseLeaveRepository implements LeaveRepository {
  async getLeaves(tenantId: string): Promise<Leave[]> {
    const { data, error } = await supabase
      .from('employee_leaves')
      .select('*, employees(name)')
      .eq('tenant_id', tenantId)
      .order('start_date', { ascending: false });

    if (error) {
      throw new Error(error.message);
    }

    return (data || []).map((row) => ({
      id: row.id,
      tenantId: row.tenant_id,
      employeeId: row.employee_id,
      employeeName: row.employees?.name || 'موظف محذوف',
      leaveType: row.leave_type as 'paid_leave' | 'excused_absence' | 'unexcused_absence',
      days: Number(row.days),
      reason: row.reason,
      startDate: row.start_date,
      endDate: row.end_date,
      createdAt: row.created_at,
    }));
  }

  async createLeave(leave: Omit<Leave, 'id' | 'createdAt'>): Promise<Leave> {
    const { data, error } = await supabase
      .from('employee_leaves')
      .insert({
        tenant_id: leave.tenantId,
        employee_id: leave.employeeId,
        leave_type: leave.leaveType,
        days: leave.days,
        reason: leave.reason,
        start_date: leave.startDate,
        end_date: leave.endDate,
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
      leaveType: data.leave_type as 'paid_leave' | 'excused_absence' | 'unexcused_absence',
      days: Number(data.days),
      reason: data.reason,
      startDate: data.start_date,
      endDate: data.end_date,
      createdAt: data.created_at,
    };
  }

  async deleteLeave(id: string): Promise<void> {
    const { error } = await supabase
      .from('employee_leaves')
      .delete()
      .eq('id', id);

    if (error) {
      throw new Error(error.message);
    }
  }
}
