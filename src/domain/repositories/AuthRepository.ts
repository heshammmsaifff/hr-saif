import type { UserProfile } from '../entities/User';

export interface AuthRepository {
  signIn(email: string, password: string): Promise<UserProfile>;
  signOut(): Promise<void>;
  getCurrentUser(): Promise<UserProfile | null>;
  onAuthStateChange(callback: (user: UserProfile | null) => void): () => void;
  sendPasswordResetEmail(email: string): Promise<void>;
  updatePassword(newPassword: string): Promise<void>;
}
