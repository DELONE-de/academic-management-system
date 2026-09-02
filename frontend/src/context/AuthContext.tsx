// src/context/AuthContext.tsx

'use client';

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { User, AuthContextType } from '@/types';
import { authApi } from '@/lib/api';
import { getToken, setToken, getStoredUser, setStoredUser, clearSession } from '@/lib/session';
import { toFriendlyError } from '@/lib/errors';
import toast from 'react-hot-toast';

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [token, setTokenState] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();

  // Load user from persistent storage on mount
  useEffect(() => {
    const loadUser = async () => {
      try {
        const storedToken = getToken();
        const storedUser = getStoredUser<User>();

        if (storedToken && storedUser) {
          setTokenState(storedToken);
          setUser(storedUser);

          // Verify token is still valid
          try {
            const response = await authApi.getProfile();
            if (response.success) {
              setUser(response.data);
              setStoredUser(response.data);
            }
          } catch {
            clearSession();
            setTokenState(null);
            setUser(null);
          }
        }
      } catch {
        // ignore
      } finally {
        setIsLoading(false);
      }
    };

    loadUser();
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    try {
      setIsLoading(true);
      const response = await authApi.login(email, password);

      if (response.success) {
        const { user: userData, token: authToken } = response.data;

        setUser(userData);
        setTokenState(authToken);

        setToken(authToken);
        setStoredUser(userData);

        toast.success('Login successful!');
        router.push('/dashboard');
      } else {
        toast.error(response.message || 'Login failed');
      }
    } catch (error: any) {
      const friendly = toFriendlyError(error);
      toast.error(friendly.kind === 'auth' ? 'Invalid email or password.' : friendly.message);
      throw error;
    } finally {
      setIsLoading(false);
    }
  }, [router]);

  const logout = useCallback(() => {
    setUser(null);
    setTokenState(null);
    clearSession();
    toast.success('Logged out successfully');
    router.push('/login');
  }, [router]);

  const value: AuthContextType = {
    user,
    token,
    login,
    logout,
    isLoading,
    isAuthenticated: !!user && !!token,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextType {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}