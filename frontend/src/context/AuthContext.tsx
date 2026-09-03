// src/context/AuthContext.tsx

'use client';

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { User, AuthContextType } from '@/types';
import { authApi } from '@/lib/api';
import { getStoredUser, setStoredUser, clearSession } from '@/lib/session';
import { toFriendlyError } from '@/lib/errors';
import toast from 'react-hot-toast';

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();

  // On mount, hydrate from the HttpOnly cookie by fetching the profile.
  // The JWT lives in an HttpOnly cookie — it is never read from localStorage.
  useEffect(() => {
    const loadUser = async () => {
      try {
        const cached = getStoredUser<User>();
        if (cached) setUser(cached);

        // Verify session against the backend (cookie sent automatically)
        const response = await authApi.getProfile();
        if (response.success) {
          setUser(response.data);
          setStoredUser(response.data);
        } else {
          clearSession();
          setUser(null);
        }
      } catch {
        clearSession();
        setUser(null);
      } finally {
        setIsLoading(false);
      }
    };

    loadUser();
  }, []);

  // Listen for session invalidation from any API call (expired token, etc.).
  // This clears user state reactively; RouteGuard handles the redirect, so we
  // avoid the full-page-reload loop that a hard `window.location.href` causes.
  useEffect(() => {
    const onUnauthorized = () => {
      setUser(null);
      clearSession();
      setIsLoading(false);
    };
    window.addEventListener('auth:unauthorized', onUnauthorized);
    return () => window.removeEventListener('auth:unauthorized', onUnauthorized);
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    try {
      setIsLoading(true);
      const response = await authApi.login(email, password);

      if (response.success) {
        setUser(response.data.user);
        setStoredUser(response.data.user);
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

  const logout = useCallback(async () => {
    // Clear the HttpOnly cookie server-side, then clear local state
    try {
      await authApi.logout();
    } catch {
      // Even if the logout request fails, clear local session state
    }
    setUser(null);
    clearSession();
    toast.success('Logged out successfully');
    router.push('/login');
  }, [router]);

  const value: AuthContextType = {
    user,
    login,
    logout,
    isLoading,
    isAuthenticated: !!user,
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