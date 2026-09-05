import { supabase } from '../../utils/supabase';
import type { UserProfile } from '../../domain/entities/User';
import type { AuthRepository } from '../../domain/repositories/AuthRepository';
import { UserMapper } from '../mappers/UserMapper';

export class SupabaseAuthRepository implements AuthRepository {
  async signIn(email: string, password: string): Promise<UserProfile> {
    const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (authError) {
      throw new Error(authError.message);
    }

    if (!authData.user) {
      throw new Error('User not found after sign in');
    }

    return await this.fetchProfile(authData.user.id);
  }

  async signOut(): Promise<void> {
    const { error } = await supabase.auth.signOut();
    if (error) {
      throw new Error(error.message);
    }
  }

  async getCurrentUser(): Promise<UserProfile | null> {
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return null;
    }

    try {
      return await this.fetchProfile(user.id);
    } catch (err) {
      console.warn("⚠️ [Supabase Auth Warning]: Profiles query failed. Falling back to Auth metadata.", err);
      return {
        id: user.id,
        email: user.email || '',
        name: user.user_metadata?.name || null,
        role: user.email === 'heshamsaif856@gmail.com' ? 'super_admin' : (user.user_metadata?.role || 'employee'),
        tenantId: user.user_metadata?.tenant_id || null,
        createdAt: user.created_at,
      };
    }
  }

  onAuthStateChange(callback: (user: UserProfile | null) => void): () => void {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (_event, session) => {
        if (session?.user) {
          try {
            const profile = await this.fetchProfile(session.user.id);
            callback(profile);
          } catch (err) {
            console.warn("⚠️ [Supabase Auth Sync Warning]: Profiles state sync query failed. Falling back to Auth metadata.", err);
            callback({
              id: session.user.id,
              email: session.user.email || '',
              name: session.user.user_metadata?.name || null,
              role: session.user.email === 'heshamsaif856@gmail.com' ? 'super_admin' : (session.user.user_metadata?.role || 'employee'),
              tenantId: session.user.user_metadata?.tenant_id || null,
              createdAt: session.user.created_at,
            });
          }
        } else {
          callback(null);
        }
      }
    );

    return () => subscription.unsubscribe();
  }

  private async fetchProfile(userId: string): Promise<UserProfile> {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single();

    if (error) {
      throw new Error(`Error fetching profile: ${error.message}`);
    }

    return UserMapper.toDomain(data);
  }

  async sendPasswordResetEmail(email: string): Promise<void> {
    const redirectToUrl = `${window.location.origin}/reset-password`;
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: redirectToUrl,
    });

    if (error) {
      throw new Error(error.message);
    }
  }

  async updatePassword(newPassword: string): Promise<void> {
    const { error } = await supabase.auth.updateUser({
      password: newPassword,
    });

    if (error) {
      throw new Error(error.message);
    }
  }
}
export const authRepository = new SupabaseAuthRepository();
