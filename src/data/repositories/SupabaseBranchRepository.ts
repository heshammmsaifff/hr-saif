import { supabase } from '../../utils/supabase';
import type { Branch } from '../../domain/entities/Branch';
import type { BranchRepository } from '../../domain/repositories/BranchRepository';

export class SupabaseBranchRepository implements BranchRepository {
  async getBranches(tenantId: string): Promise<Branch[]> {
    const { data, error } = await supabase
      .from('branches')
      .select('*')
      .eq('tenant_id', tenantId)
      .order('created_at', { ascending: false });

    if (error) {
      throw new Error(error.message);
    }

    return (data || []).map((row) => ({
      id: row.id,
      tenantId: row.tenant_id,
      name: row.name,
      address: row.address,
      createdAt: row.created_at,
    }));
  }

  async createBranch(branch: Omit<Branch, 'id' | 'createdAt'>): Promise<Branch> {
    const { data, error } = await supabase
      .from('branches')
      .insert({
        tenant_id: branch.tenantId,
        name: branch.name,
        address: branch.address,
      })
      .select()
      .single();

    if (error) {
      throw new Error(error.message);
    }

    return {
      id: data.id,
      tenantId: data.tenant_id,
      name: data.name,
      address: data.address,
      createdAt: data.created_at,
    };
  }

  async updateBranch(id: string, branch: Omit<Branch, 'id' | 'createdAt'>): Promise<Branch> {
    const { data, error } = await supabase
      .from('branches')
      .update({
        name: branch.name,
        address: branch.address,
      })
      .eq('id', id)
      .select()
      .single();

    if (error) {
      throw new Error(error.message);
    }

    return {
      id: data.id,
      tenantId: data.tenant_id,
      name: data.name,
      address: data.address,
      createdAt: data.created_at,
    };
  }

  async deleteBranch(id: string): Promise<void> {
    const { error } = await supabase
      .from('branches')
      .delete()
      .eq('id', id);

    if (error) {
      throw new Error(error.message);
    }
  }
}
