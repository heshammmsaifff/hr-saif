import { supabase } from '../../utils/supabase';
import type { TenantSettings } from '../../domain/entities/TenantSettings';
import type { TenantSettingsRepository } from '../../domain/repositories/TenantSettingsRepository';

export class SupabaseTenantSettingsRepository implements TenantSettingsRepository {
  async getSettings(tenantId: string): Promise<TenantSettings> {
    const { data, error } = await supabase
      .from('tenant_settings')
      .select('*')
      .eq('tenant_id', tenantId)
      .maybeSingle();

    if (error) {
      throw new Error(error.message);
    }

    if (!data) {
      // Default configurations: 2 monthly leaves, 1.0 excused deduction, 2.0 unexcused deduction
      return {
        tenantId,
        paidLeavesLimit: 2,
        excusedAbsenceDeduction: 1.0,
        unexcusedAbsenceDeduction: 2.0,
        allowEmployeeViewSalary: true,
        allowEmployeeSubmitRequests: true,
      };
    }

    return {
      tenantId: data.tenant_id,
      paidLeavesLimit: data.paid_leaves_limit,
      excusedAbsenceDeduction: Number(data.excused_absence_deduction),
      unexcusedAbsenceDeduction: Number(data.unexcused_absence_deduction),
      allowEmployeeViewSalary: data.allow_employee_view_salary,
      allowEmployeeSubmitRequests: data.allow_employee_submit_requests,
    };
  }

  async saveSettings(settings: TenantSettings): Promise<TenantSettings> {
    const { data, error } = await supabase
      .from('tenant_settings')
      .upsert({
        tenant_id: settings.tenantId,
        paid_leaves_limit: settings.paidLeavesLimit,
        excused_absence_deduction: settings.excusedAbsenceDeduction,
        unexcused_absence_deduction: settings.unexcusedAbsenceDeduction,
        allow_employee_view_salary: settings.allowEmployeeViewSalary ?? true,
        allow_employee_submit_requests: settings.allowEmployeeSubmitRequests ?? true,
        updated_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (error) {
      throw new Error(error.message);
    }

    return {
      tenantId: data.tenant_id,
      paidLeavesLimit: data.paid_leaves_limit,
      excusedAbsenceDeduction: Number(data.excused_absence_deduction),
      unexcusedAbsenceDeduction: Number(data.unexcused_absence_deduction),
      allowEmployeeViewSalary: data.allow_employee_view_salary,
      allowEmployeeSubmitRequests: data.allow_employee_submit_requests,
    };
  }
}
