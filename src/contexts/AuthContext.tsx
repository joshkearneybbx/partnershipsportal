'use client';

import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { pb, loginWithGoogle, logout as pbLogout } from '@/lib/pocketbase';
import { AuthUser } from '@/types';

interface AuthContextType {
  user: AuthUser | null;
  isLoading: boolean;
  login: () => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Check for existing auth on mount
    const checkAuth = () => {
      console.log('[AuthContext] Checking auth on mount...');
      console.log('[AuthContext] pb.authStore.isValid:', pb.authStore.isValid);
      console.log('[AuthContext] pb.authStore.token:', pb.authStore.token ? 'exists' : 'null');

      if (pb.authStore.isValid && pb.authStore.model) {
        const model = pb.authStore.model;
        console.log('[AuthContext] Found valid auth, user:', model.email);
        setUser({
          id: model.id,
          email: model.email || '',
          name: model.name || model.username || '',
          avatar: model.avatar ? pb.files.getUrl(model, model.avatar) : undefined,
        });
      } else {
        console.log('[AuthContext] No valid auth found');
      }
      setIsLoading(false);
    };

    checkAuth();

    // Listen for auth changes
    const unsubscribe = pb.authStore.onChange(() => {
      console.log('[AuthContext] Auth store changed');
      console.log('[AuthContext] pb.authStore.isValid:', pb.authStore.isValid);

      if (pb.authStore.isValid && pb.authStore.model) {
        const model = pb.authStore.model;
        console.log('[AuthContext] User authenticated:', model.email);
        setUser({
          id: model.id,
          email: model.email || '',
          name: model.name || model.username || '',
          avatar: model.avatar ? pb.files.getUrl(model, model.avatar) : undefined,
        });
      } else {
        console.log('[AuthContext] User logged out or invalid');
        setUser(null);
      }
    });

    return () => {
      unsubscribe();
    };
  }, []);

  const login = async () => {
    try {
      setIsLoading(true);
      console.log('[AuthContext] Starting login...');
      const authData = await loginWithGoogle();
      console.log('[AuthContext] Login completed, authData:', authData ? 'received' : 'null');
      console.log('[AuthContext] After login - pb.authStore.isValid:', pb.authStore.isValid);
      console.log('[AuthContext] After login - pb.authStore.token:', pb.authStore.token ? 'exists' : 'null');
    } catch (error) {
      console.error('[AuthContext] Login error:', error);
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const logout = () => {
    pbLogout();
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, isLoading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
