import React, { createContext, useContext, useEffect, useState } from 'react';
import type { UserProfile } from '../../domain/entities/User';
import { authRepository } from '../../data/repositories/SupabaseAuthRepository';

interface AuthContextType {
  user: UserProfile | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<UserProfile>;
  logout: () => Promise<void>;
  sendPasswordResetEmail: (email: string) => Promise<void>;
  updatePassword: (newPassword: string) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;
    let unsubscribe = () => {};

    // Safety timeout: force loading to false after 3 seconds under any circumstances
    const timeoutId = setTimeout(() => {
      if (isMounted) {
        console.warn("⚠️ [useAuth Safety Timeout]: Auth initialization took too long. Forcing loading to false.");
        setLoading(false);
      }
    }, 3000);

    async function checkInitialSession() {
      try {
        const currentUser = await authRepository.getCurrentUser();
        if (isMounted) {
          setUser(currentUser);
          clearTimeout(timeoutId);
          setLoading(false);
        }
      } catch (err) {
        console.error("useAuth: Error checking initial session:", err);
        if (isMounted) {
          setUser(null);
          clearTimeout(timeoutId);
          setLoading(false);
        }
      }

      // Now set up listener for subsequent changes
      try {
        unsubscribe = authRepository.onAuthStateChange((updatedUser) => {
          if (isMounted) {
            setUser(updatedUser);
            clearTimeout(timeoutId);
            setLoading(false);
          }
        });
      } catch (error) {
        console.error("useAuth: Failed to subscribe to changes:", error);
      }
    }

    checkInitialSession();

    return () => {
      isMounted = false;
      clearTimeout(timeoutId);
      try {
        unsubscribe();
      } catch (err) {
        console.error("useAuth: Error unsubscribing:", err);
      }
    };
  }, []);

  const login = async (email: string, password: string): Promise<UserProfile> => {
    const loggedUser = await authRepository.signIn(email, password);
    setUser(loggedUser);
    return loggedUser;
  };

  const logout = async (): Promise<void> => {
    try {
      setUser(null);
      await authRepository.signOut();
    } catch (err) {
      console.error("useAuth: Sign out error:", err);
    }
  };

  const sendPasswordResetEmail = async (email: string): Promise<void> => {
    await authRepository.sendPasswordResetEmail(email);
  };

  const updatePassword = async (newPassword: string): Promise<void> => {
    await authRepository.updatePassword(newPassword);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        login,
        logout,
        sendPasswordResetEmail,
        updatePassword,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
